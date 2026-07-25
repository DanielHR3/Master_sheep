import re

with open("app.go", "r") as f:
    lines = f.readlines()

new_lines = []
in_auth = False

for i, line in enumerate(lines):
    # Add tenant helper
    if "func (a *App) Logout() {" in line:
        new_lines.append("func (a *App) tenantID() string {\n\tif a.user.RanchoID != \"\" {\n\t\treturn a.user.RanchoID\n\t}\n\treturn a.user.ID\n}\n\n")
    
    # Add column
    if "ALTER TABLE tratamientos ADD COLUMN via_administracion" in line:
        new_lines.append(line)
        new_lines.append('\ta.db.Exec("ALTER TABLE users ADD COLUMN rancho_id TEXT")\n')
        continue

    # Login
    if "SELECT id, email, password, name, role FROM users" in line:
        line = line.replace("role FROM", "role, COALESCE(rancho_id, '') FROM")
    if "Scan(&u.ID, &u.Email, &u.Password, &u.Name, &u.Role)" in line:
        line = line.replace("&u.Role)", "&u.Role, &u.RanchoID)")
    if "a.user = &u" in line:
        new_lines.append('\tif u.RanchoID == "" {\n\t\tu.RanchoID = u.ID\n\t}\n')
    
    # AddUser
    if "INSERT INTO users (id, email, password, name, role) VALUES" in line:
        line = line.replace("role)", "role, rancho_id)").replace("?, ?)", "?, ?, ?)")
    if "u.ID, u.Email, string(hashedPwd), u.Name, u.Role)" in line:
        line = line.replace("u.Role)", "u.Role, a.tenantID())")
        
    # GetUsers
    if "SELECT id, email, name, role, created_at FROM users" in line:
        line = line.replace('users"))', 'users WHERE rancho_id = ? OR id = ?"), a.tenantID(), a.tenantID())')

    # Replace a.user.ID -> a.tenantID() in queries (excluding specific auth stuff if needed)
    if ", a.user.ID" in line or "(a.user.ID" in line:
        # Keep asignado_a = a.user.ID intact for tasks
        if "asignado_a = ?" in line or "GetTareas" in line:
            # We must be careful. Let's just do it manually for tasks later, or just replace the first one.
            line = line.replace("a.user.ID, a.user.ID", "a.tenantID(), a.user.ID")
        else:
            line = line.replace(", a.user.ID", ", a.tenantID()").replace("(a.user.ID", "(a.tenantID()")
            
    new_lines.append(line)

with open("app.go", "w") as f:
    f.writelines(new_lines)

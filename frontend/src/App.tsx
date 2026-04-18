import React from 'react';
import { useStore } from './context/useStore';
import { useAppLogic } from './hooks/useAppLogic';

// Services
import { CompletarTarea, ToggleDemoMode, GetHistorialClinico } from "./services/api";

// Components
import Sidebar from './components/layout/Sidebar';
import MobileNav from './components/layout/MobileNav';

// Modals
import AddAnimalModal from './components/modals/AddAnimalModal';
import AddCorralModal from './components/modals/AddCorralModal';
import TreatmentModal from './components/modals/TreatmentModal';
import WeightModal from './components/modals/WeightModal';
import WeightHistoryModal from './components/modals/WeightHistoryModal';
import AddInsumoModal from './components/modals/AddInsumoModal';
import EditAnimalModal from './components/modals/EditAnimalModal';
import ClinicalHistoryModal from './components/modals/ClinicalHistoryModal';
import PartoModal from './components/modals/PartoModal';
import ConfirmModal from './components/modals/ConfirmModal';
import ChangePasswordModal from './components/modals/ChangePasswordModal';

// Pages
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Corrales from './pages/Corrales';
import Breeding from './pages/Breeding';
import Clinical from './pages/Clinical';
import Staff from './pages/Staff';
import Profile from './pages/Profile';
import Login from './pages/Login';

function App() {
  const store = useStore();
  const { state, actions, refs } = useAppLogic();

  if (!store.isLoggedIn) {
    return (
      <Login 
        onLogin={actions.handleLogin} 
        loading={store.loading} 
        email={state.email} 
        setEmail={state.setEmail} 
        password={state.password} 
        setPassword={state.setPassword} 
      />
    );
  }

  const renderContent = () => {
    switch (store.activeTab) {
      case 'dashboard':
        return <Dashboard 
          stats={store.stats} 
          tareas={store.tareas} 
          theme={store.theme} 
          onGlobalAdd={() => state.modals.setShowAddAnimal(true)} 
          onCompleteTask={async (id) => { await CompletarTarea(id); actions.refreshData(); }} 
        />;
      case 'inventory':
        return <Inventory 
          animals={store.animals} 
          insumos={store.insumos} 
          theme={store.theme} 
          subTab={store.subTab} 
          setSubTab={store.setSubTab} 
          onAddAnimal={() => { 
            state.setAnimalForm({ arete: '', raza: 'Dorper', sexo: 'Hembra', corral: '', peso: '', fecha_nacimiento: new Date().toISOString().split('T')[0], padre_id: '', madre_id: '', destino: 'Engorda' }); 
            state.modals.setShowAddAnimal(true); 
          }} 
          onAddInsumo={() => { 
            state.setInsumoForm({ nombre: '', tipo: 'Medicamente', stock_actual: 0, stock_minimo: 0, unidad: 'ml', costo_unitario: 0, dlas_retiro: 0, lote: '', fecha_vencimiento: '', proveedor: '' }); 
            state.modals.setShowAddInsumo(true); 
          }} 
          onConfirmUltrasound={(a: any) => { state.setSelectedAnimal(a); state.modals.setShowConfirmModal(true); }} 
          onTreatment={(a: any) => { state.setSelectedAnimal(a); state.modals.setShowTreatment(true); }} 
          onViewHistory={async (a: any) => { 
            state.setSelectedAnimal(a); 
            try {
              const history = await GetHistorialClinico(a.id);
              store.setHistorialClinico(history || []);
            } catch (e) { console.error(e); }
            state.modals.setShowHistory(true); 
          }} 
          onEditAnimal={(a) => { state.setEditAnimalForm(a); state.modals.setShowEditAnimal(true); }} 
          onDeleteAnimal={actions.handleDeleteAnimal} 
          onAddWeight={(a) => { state.setSelectedAnimal(a); state.modals.setShowWeightModal(true); }} 
          onViewWeights={actions.handleViewWeights} 
          onImportExcel={actions.handleImportExcel}
        />;
      case 'corrales':
        return <Corrales animals={store.animals} corrales={store.corrales} theme={store.theme} onAddCorral={() => state.modals.setShowAddCorral(true)} />;
      case 'breeding':
        return <Breeding animals={store.animals} form={state.breedingForm} setForm={state.setBreedingForm} onRegister={actions.handleRegisterBreeding} theme={store.theme} onRegisterParto={() => state.modals.setShowPartoModal(true)} />;
      case 'clinical':
        return <Clinical animals={store.animals} insumos={store.insumos} theme={store.theme} onTreatment={(a) => { state.setSelectedAnimal(a); state.modals.setShowTreatment(true); }} />;
      case 'staff':
        return <Staff users={store.users} form={state.usuarioForm} setForm={state.setUsuarioForm} onAdd={actions.handleAddUser} onDelete={actions.handleDeleteUser} theme={store.theme} />;
      case 'profile':
        return <Profile theme={store.theme} setTheme={store.setTheme} onSecurity={() => state.modals.setShowChangePassword(true)} onStaff={() => store.setActiveTab('staff')} user={store.currentUser} isDemo={store.isDemo} setIsDemo={store.setIsDemo} ToggleDemoMode={ToggleDemoMode} />;
      default:
        return <Dashboard stats={store.stats} tareas={store.tareas} theme={store.theme} onGlobalAdd={() => state.modals.setShowAddAnimal(true)} onCompleteTask={async (id) => { await CompletarTarea(id); actions.refreshData(); }} />;
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-1000 ${store.theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} font-sans selection:bg-antique-brass selection:text-white`}>
      {store.isDemo && (
        <div className="bg-rose-600 text-white py-2 px-6 flex items-center justify-center gap-4 animate-pulse">
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">SISTEMA EN MODO LECTURA (DEMO) - NO SE PERMITEN MODIFICACIONES</span>
        </div>
      )}
      
      <Sidebar activeTab={store.activeTab} setActiveTab={store.setActiveTab} theme={store.theme} onLogout={actions.handleLogout} />

      <main className="lg:ml-80 flex-1 p-6 md:p-12 pb-32 lg:pb-12 max-w-7xl mx-auto w-full">
        {renderContent()}
      </main>

      <input type="file" ref={refs.fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={actions.handleFileChange} />

      <MobileNav activeTab={store.activeTab} setActiveTab={store.setActiveTab} theme={store.theme} />

      {/* --- MODALS --- */}
      <AddAnimalModal 
        show={state.modals.showAddAnimal} 
        onClose={() => state.modals.setShowAddAnimal(false)} 
        form={state.animalForm} 
        setForm={state.setAnimalForm} 
        onAdd={actions.handleAddAnimal} 
        corrales={store.corrales} 
      />

      <AddCorralModal 
        show={state.modals.showAddCorral} 
        onClose={() => state.modals.setShowAddCorral(false)} 
        form={state.corralForm} 
        setForm={state.setCorralForm} 
        onAdd={actions.handleAddCorral} 
      />

      <TreatmentModal 
        show={state.modals.showTreatment} 
        onClose={() => state.modals.setShowTreatment(false)} 
        selectedAnimal={state.selectedAnimal} 
        form={state.treatmentForm} 
        setForm={state.setTreatmentForm} 
        onRegister={actions.handleRegisterTreatment} 
        insumos={store.insumos} 
      />

      <WeightModal 
        show={state.modals.showWeightModal} 
        onClose={() => state.modals.setShowWeightModal(false)} 
        selectedAnimal={state.selectedAnimal} 
        form={state.weightForm} 
        setForm={state.setWeightForm} 
        onAdd={actions.handleAddWeight} 
      />

      <WeightHistoryModal 
        show={state.modals.showWeightHistory} 
        onClose={() => state.modals.setShowWeightHistory(false)} 
        selectedAnimal={state.selectedAnimal} 
        history={state.weightHistory} 
      />

      <AddInsumoModal 
        show={state.modals.showAddInsumo} 
        onClose={() => state.modals.setShowAddInsumo(false)} 
        form={state.insumoForm} 
        setForm={state.setInsumoForm} 
        onAdd={actions.handleAddInsumo} 
      />

      <EditAnimalModal 
        show={state.modals.showEditAnimal} 
        onClose={() => state.modals.setShowEditAnimal(false)} 
        form={state.editAnimalForm} 
        setForm={state.setEditAnimalForm} 
        onUpdate={actions.handleUpdateAnimal} 
        corrales={store.corrales} 
      />

      <ClinicalHistoryModal 
        show={state.modals.showHistory} 
        onClose={() => state.modals.setShowHistory(false)} 
        selectedAnimal={state.selectedAnimal} 
        history={store.historialClinico} 
      />

      <PartoModal 
        show={state.modals.showPartoModal} 
        onClose={() => state.modals.setShowPartoModal(false)} 
        form={state.partoForm} 
        setForm={state.setPartoForm} 
        onRegister={actions.handleRegisterParto} 
        selectedAnimal={state.selectedAnimal} 
      />

      <ConfirmModal 
        show={state.modals.showConfirmModal} 
        onClose={() => state.modals.setShowConfirmModal(false)} 
        selectedAnimal={state.selectedAnimal} 
        onConfirm={actions.handleConfirmUltrasound} 
      />

      <ChangePasswordModal 
        show={state.modals.showChangePassword} 
        onClose={() => state.modals.setShowChangePassword(false)} 
        form={state.changePasswordForm} 
        setForm={state.setChangePasswordForm} 
        onUpdate={actions.handleChangePassword} 
      />
    </div>
  );
}

export default App;

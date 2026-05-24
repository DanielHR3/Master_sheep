import xml.etree.ElementTree as ET
import sys
import os

def extract_text_from_xml(xml_path, output_path):
    if not os.path.exists(xml_path):
        return f"Error: File {xml_path} not found"
    
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        
        # Define namespaces
        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        
        paragraphs = []
        for p in root.findall('.//w:p', ns):
            texts = [t.text for t in p.findall('.//w:t', ns) if t.text]
            if texts:
                paragraphs.append(''.join(texts))
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n\n'.join(paragraphs))
        return f"Success: Text extracted to {output_path}"
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    xml_path = r"c:\Users\mocas\OneDrive\Documentos\Master_sheep\TESIS_UNZIPPED\word\document.xml"
    output_path = r"c:\Users\mocas\OneDrive\Documentos\Master_sheep\thesis_text.txt"
    print(extract_text_from_xml(xml_path, output_path))


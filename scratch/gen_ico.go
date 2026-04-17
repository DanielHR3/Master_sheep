package main

import (
	"encoding/binary"
	"fmt"
	"io/ioutil"
	"log"
	"os"
)

// Genera un archivo .ico básico a partir de un .png
func main() {
	pngPath := "build/appicon.png"
	icoPath := "build/windows/icon.ico"

	pngData, err := ioutil.ReadFile(pngPath)
	if err != nil {
		log.Fatalf("Error leyendo PNG: %v", err)
	}

	// Un archivo ICO básico con una sola imagen PNG
	f, err := os.Create(icoPath)
	if err != nil {
		log.Fatalf("Error creando ICO: %v", err)
	}
	defer f.Close()

	// 1. Header (6 bytes)
	binary.Write(f, binary.LittleEndian, uint16(0)) // Reserved
	binary.Write(f, binary.LittleEndian, uint16(1)) // Type (1 = ICO)
	binary.Write(f, binary.LittleEndian, uint16(1)) // Count (1 image)

	// 2. Directory Entry (16 bytes)
	f.Write([]byte{0, 0}) // Width, Height (0 means 256)
	f.Write([]byte{0})    // Color Count
	f.Write([]byte{0})    // Reserved
	binary.Write(f, binary.LittleEndian, uint16(1)) // Planes
	binary.Write(f, binary.LittleEndian, uint16(32)) // Bit Count (PNG handles this)
	binary.Write(f, binary.LittleEndian, uint32(len(pngData))) // Size in bytes
	binary.Write(f, binary.LittleEndian, uint32(6 + 16)) // Offset (Header + 1 Entry)

	// 3. Image Data
	f.Write(pngData)

	fmt.Printf("Archivo .ico generado con éxito en %s a partir de %s\n", icoPath, pngPath)
}

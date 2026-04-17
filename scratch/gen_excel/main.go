package main

import (
	"fmt"
	"log"

	"github.com/xuri/excelize/v2"
)

func main() {
	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			fmt.Println(err)
		}
	}()

	// Create a new sheet
	index, _ := f.NewSheet("Animales")
	
	// Set headers
	headers := []string{"Arete", "Raza", "Sexo", "Corral", "Fecha Nacimiento", "Peso Nacer", "Padre ID", "Madre ID", "Destino"}
	for i, head := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue("Animales", cell, head)
	}

	// Sample data for Dorper sheep
	data := [][]interface{}{
		{"D-101", "Dorper", "Macho", "Corral A", "2024-01-15", 4.5, "Padre-XX", "Madre-YY", "Semental"},
		{"D-102", "Dorper", "Hembra", "Corral A", "2024-01-16", 4.2, "Padre-XX", "Madre-ZZ", "Reemplazo"},
		{"D-103", "Dorper", "Macho", "Corral B", "2024-02-01", 4.8, "Padre-XY", "Madre-YZ", "Engorda"},
		{"D-104", "Dorper", "Hembra", "Corral B", "2024-02-05", 4.1, "Padre-XY", "Madre-WW", "Reemplazo"},
		{"D-105", "Dorper", "Macho", "Corral C", "2024-03-10", 4.6, "", "", "Engorda"},
		{"D-106", "Dorper", "Hembra", "Corral C", "2024-03-12", 4.3, "", "", "Engorda"},
		{"D-107", "Dorper", "Macho", "Corral A", "2024-04-01", 4.7, "Padre-XX", "Madre-YY", "Semental"},
		{"D-108", "Dorper", "Hembra", "Corral A", "2024-04-05", 4.4, "Padre-XX", "Madre-ZZ", "Reemplazo"},
		{"D-109", "Dorper", "Macho", "Corral D", "2024-05-20", 4.9, "Padre-ZZ", "Madre-AA", "Engorda"},
		{"D-110", "Dorper", "Hembra", "Corral D", "2024-05-22", 4.0, "Padre-ZZ", "Madre-BB", "Engorda"},
	}

	for i, row := range data {
		for j, val := range row {
			cell := fmt.Sprintf("%c%d", 'A'+j, i+2)
			f.SetCellValue("Animales", cell, val)
		}
	}

	// Set active sheet
	f.SetActiveSheet(index)
	f.DeleteSheet("Sheet1")

	// Save spreadsheet by the given path.
	if err := f.SaveAs("test_animals.xlsx"); err != nil {
		log.Fatal(err)
	}
	fmt.Println("Archivo test_animals.xlsx generado con éxito.")
}

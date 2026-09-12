package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSyncStatusEndpointWithoutManager(t *testing.T) {
	a := newTestApp(t)
	rec := httptest.NewRecorder()
	a.handleSyncStatus(rec, httptest.NewRequest(http.MethodGet, "/api/sync-status", nil))
	var got map[string]interface{}
	json.Unmarshal(rec.Body.Bytes(), &got)
	if rec.Code != 200 || got["pending"] != float64(0) || got["lastSync"] != "N/A" {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
}

func TestSyncNowEndpointDrainsOutbox(t *testing.T) {
	a := newLoggedInTestApp(t)
	cloud := newFakeCloudDB(t)
	a.offlineManager = NewOfflineManager(a.db, cloud)
	if err := a.AddCorral(Corral{ID: "c1", Nombre: "Norte"}); err != nil {
		t.Fatal(err)
	}
	rec := httptest.NewRecorder()
	a.handleSyncStatus(rec, httptest.NewRequest(http.MethodGet, "/api/sync-status", nil))
	var before map[string]interface{}
	json.Unmarshal(rec.Body.Bytes(), &before)
	if before["pending"] != float64(1) {
		t.Fatalf("pending before = %v, want 1", before["pending"])
	}

	rec = httptest.NewRecorder()
	a.handleSyncNow(rec, httptest.NewRequest(http.MethodPost, "/api/sync-now", nil))
	var after map[string]interface{}
	json.Unmarshal(rec.Body.Bytes(), &after)
	if rec.Code != 200 || after["pending"] != float64(0) || after["lastSync"] == "N/A" || after["lastSync"] == "PENDING" {
		t.Fatalf("sync-now: status %d body %s", rec.Code, rec.Body.String())
	}
	var nombre string
	if err := cloud.QueryRow("SELECT nombre FROM corrales WHERE id = 'c1'").Scan(&nombre); err != nil || nombre != "Norte" {
		t.Fatalf("corral not in cloud: %v %q", err, nombre)
	}
}

func TestSyncNowRejectsGet(t *testing.T) {
	a := newTestApp(t)
	rec := httptest.NewRecorder()
	a.handleSyncNow(rec, httptest.NewRequest(http.MethodGet, "/api/sync-now", nil))
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d", rec.Code)
	}
}

// Regresión: la web mandaba las ediciones como POST (alta), que chocaba con
// la restricción UNIQUE del arete. PUT actualiza.
func TestHandleAnimalsPutUpdates(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.AddAnimal(Animal{ID: "a1", Arete: "SM-1", Raza: "Dorper"}); err != nil {
		t.Fatal(err)
	}
	body, _ := json.Marshal(Animal{ID: "a1", Arete: "SM-1", Raza: "Katahdin", MadreID: "MAD-01"})
	req := httptest.NewRequest(http.MethodPut, "/api/animals", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	a.handleAnimals(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("PUT status = %d: %s", rec.Code, rec.Body.String())
	}
	animals, _ := a.GetAnimales()
	if len(animals) != 1 || animals[0].Raza != "Katahdin" || animals[0].MadreID != "MAD-01" {
		t.Fatalf("after PUT = %+v", animals)
	}
}

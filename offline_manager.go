package main

import (
	"context"
	"database/sql"
	"log"
	"sync/atomic"
	"time"
)

// OfflineManager gestiona la lógica Offline-First y sincronización.
type OfflineManager struct {
	db           *sql.DB
	isSynching    atomic.Bool
	lastSyncTime time.Time
}

func NewOfflineManager(db *sql.DB) *OfflineManager {
	return &OfflineManager{db: db}
}

func (o *OfflineManager) StartSyncLoop(ctx context.Context, interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if !o.isSynching.Load() {
					o.syncData()
				}
			}
		}
	}()
}

func (o *OfflineManager) syncData() {
	o.isSynching.Store(true)
	defer o.isSynching.Store(false)

	// Hernia Protect: Lógica de sincronización batch sin bloquear UI 
	log.Println("[OfflineManager] Sincronizando con la nube...")
	time.Sleep(2 * time.Second) // Simulando red
	o.lastSyncTime = time.Now()
}

func (o *OfflineManager) GetSyncStatus() string {
	if o.isSynching.Load() {
		return "SYNCING"
	}
	if o.lastSyncTime.IsZero() {
		return "PENDING"
	}
	return o.lastSyncTime.Format("15:04:05")
}

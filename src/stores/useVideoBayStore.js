import { create } from 'zustand';

export const useVideoBayStore = create((set) => ({
  activeVideo: null, // { url, exerciseName, date }
  drawnCoordinates: [], // [{ id, type: 'line'|'angle', points: [x1, y1, x2, y2], label: '' }]
  comparisonVideo: null, // second video to show side-by-side
  colorTheme: '#FF5C00', // Default burnt orange line

  setActiveVideo: (video) => set({ activeVideo: video, drawnCoordinates: [] }),
  setComparisonVideo: (video) => set({ comparisonVideo: video }),
  
  setDrawnCoordinates: (coords) => set({ drawnCoordinates: coords }),
  addCoordinate: (coord) => set((state) => ({ 
    drawnCoordinates: [...state.drawnCoordinates, { ...coord, id: Date.now().toString() }] 
  })),
  
  clearVideoBay: () => set({ activeVideo: null, drawnCoordinates: [], comparisonVideo: null }),
  setColorTheme: (colorTheme) => set({ colorTheme })
}));

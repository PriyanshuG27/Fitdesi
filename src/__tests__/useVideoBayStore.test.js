import { describe, it, expect, beforeEach } from 'vitest';
import { useVideoBayStore } from '../stores/useVideoBayStore';

describe('useVideoBayStore', () => {
  beforeEach(() => {
    useVideoBayStore.setState({
      activeVideo: null,
      drawnCoordinates: [],
      comparisonVideo: null,
      colorTheme: '#FF5C00',
    });
  });

  it('sets active video and clears coordinates', () => {
    useVideoBayStore.setState({ drawnCoordinates: [{ id: '1' }] });
    const video = { url: 'vid1.mp4', exerciseName: 'Squat', date: '2026-06-09' };

    useVideoBayStore.getState().setActiveVideo(video);

    const state = useVideoBayStore.getState();
    expect(state.activeVideo).toEqual(video);
    expect(state.drawnCoordinates).toEqual([]);
  });

  it('sets comparison video', () => {
    const video = { url: 'vid2.mp4', exerciseName: 'Squat Pro' };
    useVideoBayStore.getState().setComparisonVideo(video);
    expect(useVideoBayStore.getState().comparisonVideo).toEqual(video);
  });

  it('sets and adds coordinates', () => {
    const coords = [{ id: 'a', points: [0, 0, 1, 1] }];
    useVideoBayStore.getState().setDrawnCoordinates(coords);
    expect(useVideoBayStore.getState().drawnCoordinates).toEqual(coords);

    useVideoBayStore.getState().addCoordinate({ type: 'angle', points: [1, 2, 3, 4] });
    const updatedCoords = useVideoBayStore.getState().drawnCoordinates;
    expect(updatedCoords.length).toBe(2);
    expect(updatedCoords[1].type).toBe('angle');
    expect(updatedCoords[1].id).toBeDefined();
  });

  it('clears all video bay state', () => {
    useVideoBayStore.setState({
      activeVideo: { url: 'v' },
      drawnCoordinates: [{ id: 'x' }],
      comparisonVideo: { url: 'c' },
    });

    useVideoBayStore.getState().clearVideoBay();

    const state = useVideoBayStore.getState();
    expect(state.activeVideo).toBeNull();
    expect(state.drawnCoordinates).toEqual([]);
    expect(state.comparisonVideo).toBeNull();
  });

  it('sets color theme', () => {
    useVideoBayStore.getState().setColorTheme('#00FF00');
    expect(useVideoBayStore.getState().colorTheme).toBe('#00FF00');
  });
});

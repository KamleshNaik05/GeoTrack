import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function useGeofence() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchZones = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('geofence_zones')
        .select('*')
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      setZones(data || []);
    } catch (error) {
      console.error('Error loading geofence zones:', error.message);
      toast.error('Failed to load geofence zones.');
    } finally {
      setLoading(false);
    }
  }, []);

  const addZone = async ({ name, type, coordinates, color }) => {
    try {
      const { data, error } = await supabase
        .from('geofence_zones')
        .insert({
          zone_name: name,
          zone_type: type,
          coordinates,
          color,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success(`Geofence zone "${name}" created successfully.`);
      setZones((prev) => [...prev, data]);
      return { data, error: null };
    } catch (error) {
      console.error('Error creating geofence zone:', error.message);
      toast.error('Failed to create geofence zone.');
      return { data: null, error };
    }
  };

  const deleteZone = async (id) => {
    try {
      const { error } = await supabase
        .from('geofence_zones')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Geofence zone deleted.');
      setZones((prev) => prev.filter((zone) => zone.id !== id));
      return { error: null };
    } catch (error) {
      console.error('Error deleting geofence zone:', error.message);
      toast.error('Failed to delete geofence zone.');
      return { error };
    }
  };

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  return {
    zones,
    loading,
    refetch: fetchZones,
    addZone,
    deleteZone,
  };
}

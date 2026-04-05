'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

export type BluetoothStatus = 'unsupported' | 'idle' | 'scanning' | 'connected' | 'disconnected';

export function useBluetooth(targetDeviceName: string) {
  const [status, setStatus] = useState<BluetoothStatus>('idle');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deviceRef = useRef<any>(null);

  const isSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;

  useEffect(() => {
    if (!isSupported) setStatus('unsupported');
  }, [isSupported]);

  const connect = useCallback(async () => {
    if (!isSupported) return false;
    try {
      setStatus('scanning');

      // Request any Bluetooth device - user picks the car from OS dialog
      const filters = targetDeviceName ? [{ name: targetDeviceName }] : [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bluetooth = (navigator as any).bluetooth;
      const device = await bluetooth.requestDevice(
        filters.length > 0
          ? { filters, optionalServices: ['generic_access'] }
          : { acceptAllDevices: true, optionalServices: ['generic_access'] }
      );

      deviceRef.current = device;
      setDeviceName(device.name ?? 'Okänd enhet');
      setStatus('connected');

      device.addEventListener('gattserverdisconnected', () => {
        setStatus('disconnected');
        setDeviceName(null);
      });

      return true;
    } catch (e) {
      // User cancelled or error
      setStatus('idle');
      console.warn('Bluetooth:', e);
      return false;
    }
  }, [isSupported, targetDeviceName]);

  const disconnect = useCallback(() => {
    deviceRef.current?.gatt?.disconnect();
    deviceRef.current = null;
    setStatus('idle');
    setDeviceName(null);
  }, []);

  return { status, deviceName, connect, disconnect, isSupported };
}

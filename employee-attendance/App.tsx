import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AttendanceScreen from './src/screens/AttendanceScreen';

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <AttendanceScreen />
    </>
  );
}

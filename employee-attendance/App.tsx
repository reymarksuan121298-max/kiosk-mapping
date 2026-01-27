import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from './config';

export default function App() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [scanType, setScanType] = useState<'Time In' | 'Time Out'>('Time In');
    const [result, setResult] = useState<{ type: 'success' | 'error'; message: string; employee?: any; scanType?: string } | null>(null);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Error', 'Location permission required');
                return;
            }
            refreshLocation();
        })();
    }, []);

    const refreshLocation = async () => {
        setIsLocating(true);
        try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setLocation(loc);
        } catch (e) {
            console.log('Error fetching location', e);
            Alert.alert('Error', 'Could not fetch GPS location');
        } finally {
            setIsLocating(false);
        }
    };

    if (!permission) return <View />;

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>Camera permission is required</Text>
                <TouchableOpacity style={styles.button} onPress={requestPermission}>
                    <Text style={styles.buttonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
        if (scanned || processing) return;

        setScanned(true);
        setProcessing(true);
        setResult(null);

        // Parse ID
        let employeeId = data.trim();
        const idMatch = employeeId.match(/ID\s*:\s*([^\n\r]+)/i);
        if (idMatch && idMatch[1]) {
            employeeId = idMatch[1].trim();
        }

        try {
            if (!location) {
                Alert.alert('Error', 'Waiting for GPS fix...');
                resetScanner();
                return;
            }

            // Record attendance without authentication
            const response = await axios.post(`${API_URL}/attendance/clock-in`, {
                employeeId: employeeId,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                type: scanType
            });

            setResult({
                type: 'success',
                message: `Welcome, ${response.data.employee?.fullName || 'Employee'}!\n\n${scanType} recorded at ${new Date().toLocaleTimeString()}`,
                employee: response.data.employee,
                scanType: scanType
            });

            // Auto reset after 4 seconds
            setTimeout(() => resetScanner(), 4000);

        } catch (error: any) {
            const msg = error.response?.data?.error || `Attendance failed for ID: ${employeeId}`;
            setResult({ type: 'error', message: msg });
            setTimeout(() => resetScanner(), 3000);
        }
    };

    const resetScanner = () => {
        setScanned(false);
        setProcessing(false);
        setResult(null);
    };

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            />

            <SafeAreaView style={styles.overlay}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Employee Attendance</Text>
                        <Text style={styles.subtitle}>Scan your QR code for Time In/Out</Text>
                    </View>

                    {/* Scan Type Selection */}
                    <View style={styles.typeContainer}>
                        <View style={{ flex: 1, gap: 4 }}>
                            <TouchableOpacity
                                style={[styles.typeButton, scanType === 'Time In' && styles.typeButtonActive]}
                                onPress={() => setScanType('Time In')}
                            >
                                <Text style={[styles.typeButtonText, scanType === 'Time In' && styles.typeButtonTextActive]}>TIME IN</Text>
                            </TouchableOpacity>
                            <Text style={styles.timeHint}>6:00 - 8:30 AM</Text>
                        </View>
                        <View style={{ flex: 1, gap: 4 }}>
                            <TouchableOpacity
                                style={[styles.typeButton, scanType === 'Time Out' && styles.typeButtonActiveOut]}
                                onPress={() => setScanType('Time Out')}
                            >
                                <Text style={[styles.typeButtonText, scanType === 'Time Out' && styles.typeButtonTextActive]}>TIME OUT</Text>
                            </TouchableOpacity>
                            <Text style={styles.timeHint}>8:30 - 9:00 PM</Text>
                        </View>
                    </View>

                    <View style={styles.badgeRow}>
                        <View style={[styles.locationBadge, !location && styles.locationBadgeError]}>
                            <Text style={styles.locationText}>
                                {isLocating ? '📍 Locating...' : location ? '📍 GPS Active' : '📍 No Signal'}
                            </Text>
                        </View>

                        <View style={styles.clockBadge}>
                            <Text style={styles.locationText}>
                                🕒 {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Center Content */}
                <View style={styles.centerContent}>
                    {result ? (
                        <View style={[styles.resultCard, result.type === 'error' ? styles.resultError : styles.resultSuccess]}>
                            {result.employee?.photoUrl && (
                                <Image
                                    source={{ uri: result.employee.photoUrl }}
                                    style={styles.employeePhoto}
                                />
                            )}
                            <Text style={styles.resultIcon}>{result.type === 'success' ? '✓' : '✕'}</Text>
                            <Text style={styles.resultTitle}>{result.type === 'success' ? result.scanType?.toUpperCase() : 'ERROR'}</Text>
                            <Text style={styles.resultMessage}>{result.message}</Text>
                            {result.employee && (
                                <View style={styles.employeeInfo}>
                                    <Text style={styles.employeeInfoText}>ID: {result.employee.employeeId}</Text>
                                    <Text style={styles.employeeInfoText}>Role: {result.employee.role}</Text>
                                    <Text style={styles.employeeInfoText}>Area: {result.employee.area || 'N/A'}</Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.scannerFrame}>
                            <View style={[styles.scannerBox, scanType === 'Time Out' && styles.scannerBoxOut]}>
                                <View style={[styles.cornerTL, scanType === 'Time Out' && styles.cornerOut]} />
                                <View style={[styles.cornerTR, scanType === 'Time Out' && styles.cornerOut]} />
                                <View style={[styles.cornerBL, scanType === 'Time Out' && styles.cornerOut]} />
                                <View style={[styles.cornerBR, scanType === 'Time Out' && styles.cornerOut]} />
                            </View>
                            <Text style={styles.scanInstruction}>Position QR code for {scanType}</Text>
                        </View>
                    )}
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <TouchableOpacity onPress={refreshLocation} style={styles.refreshButton}>
                        <Text style={styles.refreshButtonText}>🔄 Refresh GPS</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    titleContainer: {
        marginBottom: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#94a3b8',
    },
    locationBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#10b981',
    },
    locationBadgeError: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: '#ef4444',
    },
    locationText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    scannerFrame: {
        alignItems: 'center',
    },
    scannerBox: {
        width: 250,
        height: 250,
        position: 'relative',
    },
    cornerTL: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 40,
        height: 40,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderColor: '#10b981',
    },
    cornerTR: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 40,
        height: 40,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderColor: '#10b981',
    },
    cornerBL: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 40,
        height: 40,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderColor: '#10b981',
    },
    cornerBR: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 40,
        height: 40,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderColor: '#10b981',
    },
    scanInstruction: {
        marginTop: 24,
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    resultCard: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        maxWidth: 350,
        borderWidth: 2,
    },
    resultSuccess: {
        borderColor: '#10b981',
    },
    resultError: {
        borderColor: '#ef4444',
    },
    employeePhoto: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 16,
        borderWidth: 3,
        borderColor: '#10b981',
    },
    resultIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    resultTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 12,
    },
    resultMessage: {
        fontSize: 16,
        color: '#e2e8f0',
        textAlign: 'center',
        lineHeight: 24,
    },
    employeeInfo: {
        marginTop: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 16,
        borderRadius: 8,
        width: '100%',
    },
    employeeInfoText: {
        color: '#94a3b8',
        fontSize: 14,
        marginBottom: 4,
    },
    footer: {
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        alignItems: 'center',
    },
    refreshButton: {
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#3b82f6',
    },
    refreshButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    message: {
        color: '#fff',
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#10b981',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    typeContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    typeButton: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    typeButtonActive: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: '#10b981',
    },
    typeButtonActiveOut: {
        backgroundColor: 'rgba(249, 115, 22, 0.2)',
        borderColor: '#f97316',
    },
    typeButtonText: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    typeButtonTextActive: {
        color: '#fff',
    },
    scannerBoxOut: {
        borderColor: '#f97316',
    },
    cornerOut: {
        borderColor: '#f97316',
    },
    timeHint: {
        color: '#94a3b8',
        fontSize: 10,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    clockBadge: {
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#3b82f6',
    },
});

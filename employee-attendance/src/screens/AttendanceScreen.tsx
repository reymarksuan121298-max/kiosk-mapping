import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeScanningResult } from 'expo-camera';
import * as Location from 'expo-location';
import type { LocationObject } from 'expo-location';
import { attendanceAPI } from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, CheckCircle, AlertTriangle, Clock, LogIn, LogOut } from 'lucide-react-native';

export default function AttendanceScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [location, setLocation] = useState<LocationObject | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [capturedId, setCapturedId] = useState<string | null>(null);
    const [scanResult, setScanResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showActionButtons, setShowActionButtons] = useState(false);

    // Update current time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const refreshLocation = React.useCallback(async () => {
        setIsLocating(true);
        try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setLocation(loc);
        } catch (e) {
            console.log('Error fetching location', e);
            setScanResult({ type: 'error', message: 'Could not fetch GPS location' });
        } finally {
            setIsLocating(false);
        }
    }, []);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Location permission is required for attendance tracking');
                return;
            }
            refreshLocation();
        })();
    }, [refreshLocation]);

    if (!permission) return <View />;
    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>Camera permission is required</Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleBarCodeScanned = (result: { data: string }) => {
        if (scanned || processing || capturedId) return;

        const { data } = result;
        setScanned(true);
        setScanResult(null);

        // Parse ID
        let employeeId = data.trim();
        const idMatch = employeeId.match(/ID\s*:\s*([^\n\r]+)/i);
        if (idMatch && idMatch[1]) {
            employeeId = idMatch[1].trim();
        }

        // Capture employee ID and show action buttons
        setCapturedId(employeeId);
        setShowActionButtons(true);
    };

    const handleAttendance = async (action: 'IN' | 'OUT') => {
        if (!capturedId) return;

        setShowActionButtons(false);
        setProcessing(true);

        try {
            if (!location) {
                setScanResult({ type: 'error', message: 'Waiting for GPS fix...' });
                setTimeout(() => resetScanner(), 2000);
                return;
            }

            const type = action === 'IN' ? 'Time In' : 'Time Out';

            const payload = {
                employeeId: capturedId,
                type: type as 'Time In' | 'Time Out',
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };

            const response = await attendanceAPI.clock(payload);
            const employeeData = response.data.employee;

            const actionText = action === 'IN' ? 'Time IN' : 'Time OUT';
            const timeStr = new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            setScanResult({
                type: 'success',
                message: `${actionText} Successful\n${employeeData.fullName}\nID: ${capturedId}\nTime: ${timeStr}`
            });

            // Auto Reset
            setTimeout(() => resetScanner(), 3000);

        } catch (error: any) {
            let msg = error.response?.data?.error || error.message || `Failed to record attendance for ID: ${capturedId}`;

            // Add distance info if available
            if (error.response?.data?.distance !== undefined) {
                const distance = error.response.data.distance;
                const allowed = error.response.data.allowedRadius || 200;
                msg += `\n\nDistance: ${distance}m\nAllowed: ${allowed}m`;
            }

            setScanResult({ type: 'error', message: msg });
            setTimeout(() => resetScanner(), 5000); // Longer timeout for errors
        } finally {
            setProcessing(false);
        }
    };

    const resetScanner = () => {
        setCapturedId(null);
        setScanResult(null);
        setScanned(false);
        setProcessing(false);
        setShowActionButtons(false);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
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
                    <View style={styles.headerLeft}>
                        <View style={styles.titleRow}>
                            <Image
                                source={require('../../assets/STL_256p.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                            <Text style={styles.appTitle}>Employee Attendance</Text>
                        </View>
                        <View style={[styles.locationBadge, !location && styles.locationBadgeError]}>
                            <MapPin size={14} color={location ? "#10b981" : "#fff"} />
                            <Text style={styles.locationText}>
                                {isLocating ? 'Locating...' : location ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}` : 'No Signal'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Date and Time Display */}
                <View style={styles.dateTimeContainer}>
                    <View style={styles.timeCard}>
                        <Clock size={24} color="#fff" />
                        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                    </View>
                    <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
                </View>

                {/* Center Content */}
                <View style={styles.centerContent}>
                    {scanResult ? (
                        <View style={[styles.resultCard, scanResult.type === 'error' ? styles.resultError : styles.resultSuccess]}>
                            {scanResult.type === 'success' ? <CheckCircle size={48} color="#fff" /> : <AlertTriangle size={48} color="#fff" />}
                            <Text style={styles.resultTitle}>{scanResult.type === 'success' ? 'SUCCESS' : 'ERROR'}</Text>
                            <Text style={styles.resultMessage}>{scanResult.message}</Text>
                        </View>
                    ) : showActionButtons ? (
                        <View style={styles.selectionCard}>
                            <Text style={styles.selectionTitle}>Select Action</Text>
                            <Text style={styles.selectionSubtitle}>ID: {capturedId}</Text>
                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.timeInButton]}
                                    onPress={() => handleAttendance('IN')}
                                >
                                    <LogIn size={48} color="#fff" />
                                    <Text style={styles.actionButtonText}>TIME IN</Text>
                                    <Text style={styles.actionButtonSub}>Clock In</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.timeOutButton]}
                                    onPress={() => handleAttendance('OUT')}
                                >
                                    <LogOut size={48} color="#fff" />
                                    <Text style={styles.actionButtonText}>TIME OUT</Text>
                                    <Text style={styles.actionButtonSub}>Clock Out</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity onPress={resetScanner} style={styles.cancelButton}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    ) : processing ? (
                        <View style={styles.processingCard}>
                            <ActivityIndicator size="large" color="#10b981" />
                            <Text style={styles.processingText}>Processing...</Text>
                            <Text style={styles.processingSubtext}>ID: {capturedId}</Text>
                        </View>
                    ) : (
                        <View style={styles.scannerFrame}>
                            <View style={styles.cornerTL} />
                            <View style={styles.cornerTR} />
                            <View style={styles.cornerBL} />
                            <View style={styles.cornerBR} />
                            <View style={styles.scanLine} />
                        </View>
                    )}
                </View>

                {/* Footer */}
                {!capturedId && !scanResult && (
                    <View style={styles.footer}>
                        <Text style={styles.instructionText}>Scan your QR code to record attendance</Text>
                        <TouchableOpacity onPress={refreshLocation} style={styles.refreshButton}>
                            <Text style={styles.refreshButtonText}>Refresh GPS</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000'
    },
    overlay: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 20
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    headerLeft: {
        gap: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    logo: {
        width: 40,
        height: 40,
        borderRadius: 8,
    },
    appTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: '#10b981',
        alignSelf: 'flex-start',
    },
    locationBadgeError: {
        borderColor: '#ef4444'
    },
    locationText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12
    },
    dateTimeContainer: {
        alignItems: 'center',
        gap: 8,
    },
    timeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 16,
        gap: 12,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    timeText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        fontFamily: 'monospace',
    },
    dateText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1
    },
    scannerFrame: {
        width: 260,
        height: 260,
        position: 'relative'
    },
    cornerTL: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 40,
        height: 40,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderColor: '#fff',
        borderTopLeftRadius: 16
    },
    cornerTR: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 40,
        height: 40,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderColor: '#fff',
        borderTopRightRadius: 16
    },
    cornerBL: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 40,
        height: 40,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderColor: '#fff',
        borderBottomLeftRadius: 16
    },
    cornerBR: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 40,
        height: 40,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderColor: '#fff',
        borderBottomRightRadius: 16
    },
    scanLine: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: '#10b981',
        opacity: 0.8
    },

    // Processing Card
    processingCard: {
        width: '95%',
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 40,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    processingText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0f172a',
        marginTop: 16
    },
    processingSubtext: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 8,
        fontFamily: 'monospace'
    },

    // Selection Card
    selectionCard: {
        width: '95%',
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    selectionTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#0f172a',
        marginBottom: 4
    },
    selectionSubtitle: {
        fontSize: 16,
        color: '#64748b',
        marginBottom: 24,
        fontFamily: 'monospace',
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        marginBottom: 16
    },
    actionButton: {
        flex: 1,
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 160,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    timeInButton: {
        backgroundColor: '#10b981',
    },
    timeOutButton: {
        backgroundColor: '#ef4444',
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 18,
        letterSpacing: 1,
    },
    actionButtonSub: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
        fontWeight: '600'
    },
    cancelButton: {
        padding: 12
    },
    cancelText: {
        color: '#64748b',
        fontWeight: '600',
        fontSize: 14,
    },

    // Result Card
    resultCard: {
        width: '85%',
        padding: 32,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10
    },
    resultSuccess: {
        backgroundColor: 'rgba(16, 185, 129, 0.95)'
    },
    resultError: {
        backgroundColor: 'rgba(239, 68, 68, 0.95)'
    },
    resultTitle: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: 2
    },
    resultMessage: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        fontWeight: '600',
        lineHeight: 24,
    },

    footer: {
        alignItems: 'center',
        gap: 12
    },
    instructionText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4
    },
    refreshButton: {
        padding: 8
    },
    refreshButtonText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: '600',
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
        color: '#fff',
        fontSize: 16,
    },
    permissionButton: {
        backgroundColor: '#10b981',
        padding: 16,
        borderRadius: 12,
        marginHorizontal: 20,
    },
    permissionButtonText: {
        color: '#fff',
        fontWeight: '700',
        textAlign: 'center',
        fontSize: 16,
    },
});

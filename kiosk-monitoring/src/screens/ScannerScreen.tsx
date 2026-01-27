import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { monitoringAPI } from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, LogOut, CheckCircle, AlertTriangle, UserCheck, UserX } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

export default function ScannerScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [capturedId, setCapturedId] = useState<string | null>(null);
    const [scanResult, setScanResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [remarks, setRemarks] = useState('');
    const [showRemarksModal, setShowRemarksModal] = useState(false);
    const { logout } = useAuth();

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setScanResult({ type: 'error', message: 'Location permission required' });
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
            setScanResult({ type: 'error', message: 'Could not fetch GPS location' });
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

    const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
        if (scanned || processing || capturedId) return;

        setScanned(true);

        // Reset result
        setScanResult(null);

        // Parse ID
        let employeeId = data.trim();
        const idMatch = employeeId.match(/ID\s*:\s*([^\n\r]+)/i);
        if (idMatch && idMatch[1]) {
            employeeId = idMatch[1].trim();
        }

        // Pause and show selection
        setCapturedId(employeeId);
    };

    const handleStatusSelect = async (status: 'Active' | 'Inactive', submittedRemarks?: string) => {
        if (!capturedId) return;

        if (status === 'Inactive' && !submittedRemarks && !showRemarksModal) {
            setShowRemarksModal(true);
            return;
        }

        setProcessing(true);
        setShowRemarksModal(false);

        try {
            if (!location) {
                setScanResult({ type: 'error', message: 'Waiting for GPS fix...' });
                setTimeout(() => resetScanner(), 2000);
                return;
            }

            const payload = {
                employeeId: capturedId,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                status: status,
                remarks: submittedRemarks || undefined
            };

            await monitoringAPI.scan(payload);

            setScanResult({
                type: 'success',
                message: `ID: ${capturedId}\nMarked as ${status}`
            });

            // Auto Reset
            setRemarks('');
            setTimeout(() => resetScanner(), 3000);

        } catch (error: any) {
            const msg = error.response?.data?.error || `Scan Failed for ID: ${capturedId}`;
            setScanResult({ type: 'error', message: msg });
            setTimeout(() => resetScanner(), 3000);
        }
    };

    const resetScanner = () => {
        setCapturedId(null);
        setScanResult(null);
        setScanned(false);
        setProcessing(false);
        setRemarks('');
        setShowRemarksModal(false);
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
                <View style={styles.header}>
                    <View style={[styles.locationBadge, !location && styles.locationBadgeError]}>
                        <MapPin size={16} color={location ? "#10b981" : "#fff"} />
                        <Text style={styles.locationText}>
                            {isLocating ? 'Locating...' : location ? 'GPS Active' : 'No Signal'}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={logout} style={styles.logoutButton}>
                        <LogOut size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.centerContent}>
                    {scanResult ? (
                        <View style={[styles.resultCard, scanResult.type === 'error' ? styles.resultError : styles.resultSuccess]}>
                            {scanResult.type === 'success' ? <CheckCircle size={48} color="#fff" /> : <AlertTriangle size={48} color="#fff" />}
                            <Text style={styles.resultTitle}>{scanResult.type === 'success' ? 'SUCCESS' : 'ERROR'}</Text>
                            <Text style={styles.resultMessage}>{scanResult.message}</Text>
                        </View>
                    ) : capturedId ? (
                        <View style={styles.selectionCard}>
                            <Text style={styles.selectionTitle}>Select Status</Text>
                            <Text style={styles.selectionSubtitle}>ID: {capturedId}</Text>

                            <View style={styles.selectionButtons}>
                                <TouchableOpacity
                                    style={[styles.statusButton, styles.activeButton]}
                                    onPress={() => handleStatusSelect('Active')}
                                    disabled={processing}
                                >
                                    <UserCheck size={32} color="#fff" />
                                    <Text style={styles.statusButtonText}>ACTIVE</Text>
                                    <Text style={styles.statusButtonSub}>Client/Bot Present</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.statusButton, styles.inactiveButton]}
                                    onPress={() => handleStatusSelect('Inactive')}
                                    disabled={processing}
                                >
                                    <UserX size={32} color="#fff" />
                                    <Text style={styles.statusButtonText}>INACTIVE</Text>
                                    <Text style={styles.statusButtonSub}>No Bot On Duty</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity onPress={resetScanner} style={styles.cancelButton}>
                                <Text style={styles.cancelText}>Cancel Scan</Text>
                            </TouchableOpacity>
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

                {/* Remarks Modal */}
                <Modal
                    visible={showRemarksModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowRemarksModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Inactive Remarks</Text>
                            <Text style={styles.modalSubtitle}>Please provide a reason why this employee is inactive.</Text>

                            <TextInput
                                style={styles.remarksInput}
                                placeholder="E.g., On Leave, Not at Station, etc."
                                placeholderTextColor="#94a3b8"
                                value={remarks}
                                onChangeText={setRemarks}
                                multiline
                                numberOfLines={4}
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.modalCancel]}
                                    onPress={() => setShowRemarksModal(false)}
                                >
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalButton, styles.modalSubmit]}
                                    onPress={() => handleStatusSelect('Inactive', remarks)}
                                    disabled={processing}
                                >
                                    {processing ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.modalSubmitText}>Confirm</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {!capturedId && !scanResult && (
                    <View style={styles.footer}>
                        <Text style={styles.instructionText}>Align QR code within frame</Text>
                        <TouchableOpacity onPress={refreshLocation} style={styles.locationBtn}>
                            <Text style={styles.locationBtnText}>Refresh GPS</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    overlay: { flex: 1, justifyContent: 'space-between', padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    locationBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6, borderWidth: 1, borderColor: '#10b981' },
    locationBadgeError: { borderColor: '#ef4444' },
    locationText: { color: '#fff', fontWeight: '600', fontSize: 12 },
    logoutButton: { padding: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12 },
    centerContent: { alignItems: 'center', justifyContent: 'center', flex: 1 },
    scannerFrame: { width: 260, height: 260, position: 'relative' },
    cornerTL: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#fff', borderTopLeftRadius: 16 },
    cornerTR: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#fff', borderTopRightRadius: 16 },
    cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#fff', borderBottomLeftRadius: 16 },
    cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#fff', borderBottomRightRadius: 16 },
    scanLine: { position: 'absolute', top: '50%', left: 0, right: 0, height: 2, backgroundColor: '#ef4444', opacity: 0.8 },

    // Selection Card
    selectionCard: { width: '90%', backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 10 },
    selectionTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
    selectionSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 24, fontFamily: 'monospace' },
    selectionButtons: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 16 },
    statusButton: { flex: 1, padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
    activeButton: { backgroundColor: '#10b981' },
    inactiveButton: { backgroundColor: '#64748b' },
    statusButtonText: { color: '#fff', fontWeight: '900', fontSize: 16 },
    statusButtonSub: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '600' },
    cancelButton: { padding: 12 },
    cancelText: { color: '#64748b', fontWeight: '600' },

    // Result Card
    resultCard: { width: '80%', padding: 30, borderRadius: 24, alignItems: 'center', justifyContent: 'center', gap: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    resultSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.95)' },
    resultError: { backgroundColor: 'rgba(239, 68, 68, 0.95)' },
    resultTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 1 },
    resultMessage: { color: '#fff', fontSize: 16, textAlign: 'center', fontWeight: '500' },

    footer: { alignItems: 'center', gap: 20 },
    instructionText: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '500', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
    locationBtn: { padding: 10 },
    locationBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
    message: { textAlign: 'center', paddingBottom: 10 },
    button: { backgroundColor: '#0f172a', padding: 15, borderRadius: 8 },
    buttonText: { color: '#fff', fontWeight: 'bold' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', width: '100%', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginBottom: 8 },
    modalSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 20 },
    remarksInput: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, fontSize: 16, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0', textAlignVertical: 'top', minHeight: 100, marginBottom: 20 },
    modalButtons: { flexDirection: 'row', gap: 12 },
    modalButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    modalCancel: { backgroundColor: '#f1f5f9' },
    modalSubmit: { backgroundColor: '#0f172a' },
    modalCancelText: { color: '#64748b', fontWeight: '600' },
    modalSubmitText: { color: '#fff', fontWeight: '700' },
});

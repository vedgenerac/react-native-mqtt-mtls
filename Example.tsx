import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Button,
    StyleSheet,
    ScrollView,
    TextInput,
    Alert,
} from 'react-native';
import { useMqtt, MqttMessage } from 'react-native-mqtt-mtls';

const ExampleScreen = () => {
    const { isConnected, error, connect, disconnect, subscribe, unsubscribe, publish } = useMqtt();
    const [messages, setMessages] = useState<MqttMessage[]>([]);
    const [subscribedTopic, setSubscribedTopic] = useState('');
    const [publishTopic, setPublishTopic] = useState('');
    const [publishMessage, setPublishMessage] = useState('');

    // Your MQTT configuration
    const mqttConfig = {
        broker: 'ssl://your-mqtt-broker.com:8883',
        clientId: `mqtt-client-${Math.random().toString(16).slice(2, 10)}`,
        clientCertPem: `-----BEGIN CERTIFICATE-----
YOUR_CLIENT_CERTIFICATE_HERE
-----END CERTIFICATE-----`,
        privateKeyPem: `-----BEGIN PRIVATE KEY-----
YOUR_PRIVATE_KEY_HERE
-----END PRIVATE KEY-----`,
        rootCaPem: `-----BEGIN CERTIFICATE-----
YOUR_ROOT_CA_CERTIFICATE_HERE
-----END CERTIFICATE-----`,
        connectionTimeout: 30,
        keepAlive: 60,
        autoReconnect: true,
        onMessage: (message: MqttMessage) => {
            console.log('📨 Received message:', message);
            setMessages((prev) => [...prev, message].slice(-50)); // Keep last 50 messages
        },
        onConnect: () => {
            console.log('✅ Connected to MQTT broker');
            Alert.alert('Success', 'Connected to MQTT broker');
        },
        onConnectionLost: (err: string) => {
            console.log('❌ Connection lost:', err);
        },
        onReconnect: () => {
            console.log('🔄 Reconnected to MQTT broker');
            Alert.alert('Info', 'Reconnected to MQTT broker');
        },
        onError: (err: string) => {
            console.error('⚠️ MQTT Error:', err);
        },
    };

    const handleConnect = async () => {
        try {
            await connect(mqttConfig);
        } catch (err) {
            console.error('Failed to connect:', err);
            Alert.alert('Error', `Failed to connect: ${err}`);
        }
    };

    const handleDisconnect = async () => {
        try {
            await disconnect();
            setMessages([]);
            setSubscribedTopic('');
            Alert.alert('Info', 'Disconnected from MQTT broker');
        } catch (err) {
            console.error('Failed to disconnect:', err);
            Alert.alert('Error', `Failed to disconnect: ${err}`);
        }
    };

    const handleSubscribe = async () => {
        if (!subscribedTopic.trim()) {
            Alert.alert('Error', 'Please enter a topic to subscribe');
            return;
        }

        try {
            await subscribe(subscribedTopic, 1);
            Alert.alert('Success', `Subscribed to: ${subscribedTopic}`);
        } catch (err) {
            console.error('Failed to subscribe:', err);
            Alert.alert('Error', `Failed to subscribe: ${err}`);
        }
    };

    const handleUnsubscribe = async () => {
        if (!subscribedTopic.trim()) {
            Alert.alert('Error', 'Please enter a topic to unsubscribe');
            return;
        }

        try {
            await unsubscribe(subscribedTopic);
            Alert.alert('Success', `Unsubscribed from: ${subscribedTopic}`);
            setSubscribedTopic('');
        } catch (err) {
            console.error('Failed to unsubscribe:', err);
            Alert.alert('Error', `Failed to unsubscribe: ${err}`);
        }
    };

    const handlePublish = async () => {
        if (!publishTopic.trim() || !publishMessage.trim()) {
            Alert.alert('Error', 'Please enter both topic and message');
            return;
        }

        try {
            await publish(publishTopic, publishMessage);
            Alert.alert('Success', 'Message published');
            setPublishMessage('');
        } catch (err) {
            console.error('Failed to publish:', err);
            Alert.alert('Error', `Failed to publish: ${err}`);
        }
    };

    const clearMessages = () => {
        setMessages([]);
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>MQTT mTLS Client</Text>
                <View style={styles.statusContainer}>
                    <View
                        style={[
                            styles.statusIndicator,
                            { backgroundColor: isConnected ? '#4CAF50' : '#F44336' },
                        ]}
                    />
                    <Text style={styles.statusText}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </Text>
                </View>
            </View>

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>⚠️ {error}</Text>
                </View>
            )}

            {/* Connection Controls */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Connection</Text>
                <View style={styles.buttonRow}>
                    <View style={styles.buttonWrapper}>
                        <Button
                            title="Connect"
                            onPress={handleConnect}
                            disabled={isConnected}
                            color="#4CAF50"
                        />
                    </View>
                    <View style={styles.buttonWrapper}>
                        <Button
                            title="Disconnect"
                            onPress={handleDisconnect}
                            disabled={!isConnected}
                            color="#F44336"
                        />
                    </View>
                </View>
            </View>

            {/* Subscribe Controls */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Subscribe</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Topic (e.g., sensors/temperature)"
                    value={subscribedTopic}
                    onChangeText={setSubscribedTopic}
                    editable={isConnected}
                />
                <View style={styles.buttonRow}>
                    <View style={styles.buttonWrapper}>
                        <Button
                            title="Subscribe"
                            onPress={handleSubscribe}
                            disabled={!isConnected}
                            color="#2196F3"
                        />
                    </View>
                    <View style={styles.buttonWrapper}>
                        <Button
                            title="Unsubscribe"
                            onPress={handleUnsubscribe}
                            disabled={!isConnected}
                            color="#FF9800"
                        />
                    </View>
                </View>
            </View>

            {/* Publish Controls */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Publish</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Topic (e.g., commands/device1)"
                    value={publishTopic}
                    onChangeText={setPublishTopic}
                    editable={isConnected}
                />
                <TextInput
                    style={[styles.input, styles.messageInput]}
                    placeholder="Message"
                    value={publishMessage}
                    onChangeText={setPublishMessage}
                    multiline
                    numberOfLines={3}
                    editable={isConnected}
                />
                <Button
                    title="Publish Message"
                    onPress={handlePublish}
                    disabled={!isConnected}
                    color="#9C27B0"
                />
            </View>

            {/* Messages */}
            <View style={styles.section}>
                <View style={styles.messageHeader}>
                    <Text style={styles.sectionTitle}>
                        Received Messages ({messages.length})
                    </Text>
                    {messages.length > 0 && (
                        <Button title="Clear" onPress={clearMessages} color="#757575" />
                    )}
                </View>
                {messages.length === 0 ? (
                    <Text style={styles.noMessages}>No messages yet</Text>
                ) : (
                    messages
                        .slice()
                        .reverse()
                        .map((msg, idx) => (
                            <View key={idx} style={styles.messageCard}>
                                <View style={styles.messageTopicRow}>
                                    <Text style={styles.messageTopic}>{msg.topic}</Text>
                                    <View style={styles.messageBadge}>
                                        <Text style={styles.messageBadgeText}>QoS {msg.qos}</Text>
                                    </View>
                                </View>
                                <Text style={styles.messageContent}>{msg.message}</Text>
                                {msg.retained && (
                                    <Text style={styles.retainedLabel}>🔒 Retained</Text>
                                )}
                            </View>
                        ))
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#fff',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    statusText: {
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        backgroundColor: '#FFEBEE',
        padding: 15,
        margin: 15,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#F44336',
    },
    errorText: {
        color: '#C62828',
        fontSize: 14,
    },
    section: {
        backgroundColor: '#fff',
        margin: 15,
        padding: 15,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    buttonWrapper: {
        flex: 1,
        marginHorizontal: 5,
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        fontSize: 14,
    },
    messageInput: {
        height: 80,
        textAlignVertical: 'top',
    },
    messageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    noMessages: {
        textAlign: 'center',
        color: '#999',
        fontStyle: 'italic',
        paddingVertical: 20,
    },
    messageCard: {
        backgroundColor: '#f9f9f9',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#2196F3',
    },
    messageTopicRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    messageTopic: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2196F3',
        flex: 1,
    },
    messageBadge: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    messageBadgeText: {
        fontSize: 11,
        color: '#1976D2',
        fontWeight: '600',
    },
    messageContent: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    retainedLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 5,
        fontStyle: 'italic',
    },
});

export default ExampleScreen;
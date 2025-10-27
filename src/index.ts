import { useState, useCallback, useEffect, useRef } from 'react';
import { NativeModules, NativeEventEmitter, EmitterSubscription } from 'react-native';

const { MqttModule } = NativeModules;
const eventEmitter = new NativeEventEmitter(MqttModule);

export interface MqttMessage {
    topic: string;
    message: string;
    qos: number;
    retained: boolean;
}

export interface MqttConfig {
    broker: string;
    clientId: string;
    clientCertPem: string;
    privateKeyPem: string;
    rootCaPem: string;
    connectionTimeout?: number;
    keepAlive?: number;
    autoReconnect?: boolean;
    onMessage?: (message: MqttMessage) => void;
    onConnect?: () => void;
    onConnectionLost?: (error: string) => void;
    onReconnect?: () => void;
    onError?: (error: string) => void;
}

/**
 * Custom hook for MQTT - each instance manages its own connection
 * Use this when you need multiple independent MQTT connections
 */
export const useMqtt = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const callbacksRef = useRef<MqttConfig>({} as MqttConfig);
    const subscriptionsRef = useRef<EmitterSubscription[]>([]);

    const cleanupEventListeners = useCallback(() => {
        subscriptionsRef.current.forEach(sub => sub.remove());
        subscriptionsRef.current = [];
    }, []);

    const setupEventListeners = useCallback(() => {
        cleanupEventListeners();

        MqttModule.on('message', () => { });
        MqttModule.on('connect', () => { });
        MqttModule.on('connectionLost', () => { });
        MqttModule.on('reconnect', () => { });
        MqttModule.on('error', () => { });

        const messageSubscription = eventEmitter.addListener('MqttMessage', (payload: string) => {
            try {
                const message: MqttMessage = JSON.parse(payload);
                callbacksRef.current.onMessage?.(message);
            } catch (err) {
                console.error('Failed to parse MQTT message:', err);
            }
        });

        const connectSubscription = eventEmitter.addListener('MqttConnect', () => {
            setIsConnected(true);
            setError(null);
            callbacksRef.current.onConnect?.();
        });

        const connectionLostSubscription = eventEmitter.addListener('MqttConnectionLost', (err: string) => {
            setIsConnected(false);
            setError(err);
            callbacksRef.current.onConnectionLost?.(err);
        });

        const reconnectSubscription = eventEmitter.addListener('MqttReconnect', () => {
            setIsConnected(true);
            setError(null);
            callbacksRef.current.onReconnect?.();
        });

        const errorSubscription = eventEmitter.addListener('MqttError', (err: string) => {
            setError(err);
            callbacksRef.current.onError?.(err);
        });

        subscriptionsRef.current = [
            messageSubscription,
            connectSubscription,
            connectionLostSubscription,
            reconnectSubscription,
            errorSubscription,
        ];
    }, [cleanupEventListeners]);

    useEffect(() => {
        return () => {
            cleanupEventListeners();
            // Optionally disconnect on unmount
            MqttModule.end(() => { }, () => { });
        };
    }, [cleanupEventListeners]);

    const connect = useCallback(async (config: MqttConfig) => {
        callbacksRef.current = config;

        try {
            setupEventListeners();

            await new Promise<void>((resolve, reject) => {
                MqttModule.createMqttClient(
                    config.broker,
                    config.clientId,
                    config.clientCertPem,
                    config.privateKeyPem,
                    config.rootCaPem,
                    config.connectionTimeout ?? 30,
                    config.keepAlive ?? 60,
                    config.autoReconnect ?? true,
                    () => {
                        MqttModule.connect(
                            () => resolve(),
                            (err: string) => {
                                setError(err);
                                reject(new Error(err));
                            }
                        );
                    },
                    (err: string) => {
                        setError(err);
                        reject(new Error(err));
                    }
                );
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    }, [setupEventListeners]);

    const disconnect = useCallback(async () => {
        try {
            await new Promise<void>((resolve, reject) => {
                MqttModule.end(
                    () => {
                        setIsConnected(false);
                        setError(null);
                        callbacksRef.current = {} as MqttConfig;
                        cleanupEventListeners();
                        resolve();
                    },
                    (err: string) => {
                        setError(err);
                        reject(new Error(err));
                    }
                );
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    }, [cleanupEventListeners]);

    const subscribe = useCallback(async (topic: string, qos: number = 1) => {
        if (!isConnected) {
            throw new Error('Not connected to MQTT broker');
        }

        await new Promise<void>((resolve, reject) => {
            MqttModule.subscribeToTopic(
                topic,
                qos,
                () => resolve(),
                (err: string) => reject(new Error(err))
            );
        });
    }, [isConnected]);

    const unsubscribe = useCallback(async (topic: string) => {
        if (!isConnected) {
            throw new Error('Not connected to MQTT broker');
        }

        await new Promise<void>((resolve, reject) => {
            MqttModule.unsubscribeFromTopic(
                topic,
                () => resolve(),
                (err: string) => reject(new Error(err))
            );
        });
    }, [isConnected]);

    const publish = useCallback(async (topic: string, message: string) => {
        if (!isConnected) {
            throw new Error('Not connected to MQTT broker');
        }

        await new Promise<void>((resolve, reject) => {
            MqttModule.sendMessageToBroker(
                topic,
                message,
                () => resolve(),
                (err: string) => reject(new Error(err))
            );
        });
    }, [isConnected]);

    return {
        isConnected,
        error,
        connect,
        disconnect,
        subscribe,
        unsubscribe,
        publish,
    };
};
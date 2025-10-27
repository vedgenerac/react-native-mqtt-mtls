"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMqtt = void 0;
const react_1 = require("react");
const react_native_1 = require("react-native");
const { MqttModule } = react_native_1.NativeModules;
const eventEmitter = new react_native_1.NativeEventEmitter(MqttModule);
/**
 * Custom hook for MQTT - each instance manages its own connection
 * Use this when you need multiple independent MQTT connections
 */
const useMqtt = () => {
    const [isConnected, setIsConnected] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const callbacksRef = (0, react_1.useRef)({});
    const subscriptionsRef = (0, react_1.useRef)([]);
    const cleanupEventListeners = (0, react_1.useCallback)(() => {
        subscriptionsRef.current.forEach(sub => sub.remove());
        subscriptionsRef.current = [];
    }, []);
    const setupEventListeners = (0, react_1.useCallback)(() => {
        cleanupEventListeners();
        MqttModule.on('message', () => { });
        MqttModule.on('connect', () => { });
        MqttModule.on('connectionLost', () => { });
        MqttModule.on('reconnect', () => { });
        MqttModule.on('error', () => { });
        const messageSubscription = eventEmitter.addListener('MqttMessage', (payload) => {
            try {
                const message = JSON.parse(payload);
                callbacksRef.current.onMessage?.(message);
            }
            catch (err) {
                console.error('Failed to parse MQTT message:', err);
            }
        });
        const connectSubscription = eventEmitter.addListener('MqttConnect', () => {
            setIsConnected(true);
            setError(null);
            callbacksRef.current.onConnect?.();
        });
        const connectionLostSubscription = eventEmitter.addListener('MqttConnectionLost', (err) => {
            setIsConnected(false);
            setError(err);
            callbacksRef.current.onConnectionLost?.(err);
        });
        const reconnectSubscription = eventEmitter.addListener('MqttReconnect', () => {
            setIsConnected(true);
            setError(null);
            callbacksRef.current.onReconnect?.();
        });
        const errorSubscription = eventEmitter.addListener('MqttError', (err) => {
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
    (0, react_1.useEffect)(() => {
        return () => {
            cleanupEventListeners();
            // Optionally disconnect on unmount
            MqttModule.end(() => { }, () => { });
        };
    }, [cleanupEventListeners]);
    const connect = (0, react_1.useCallback)(async (config) => {
        callbacksRef.current = config;
        try {
            setupEventListeners();
            await new Promise((resolve, reject) => {
                MqttModule.createMqttClient(config.broker, config.clientId, config.clientCertPem, config.privateKeyPem, config.rootCaPem, config.connectionTimeout ?? 30, config.keepAlive ?? 60, config.autoReconnect ?? true, () => {
                    MqttModule.connect(() => resolve(), (err) => {
                        setError(err);
                        reject(new Error(err));
                    });
                }, (err) => {
                    setError(err);
                    reject(new Error(err));
                });
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    }, [setupEventListeners]);
    const disconnect = (0, react_1.useCallback)(async () => {
        try {
            await new Promise((resolve, reject) => {
                MqttModule.end(() => {
                    setIsConnected(false);
                    setError(null);
                    callbacksRef.current = {};
                    cleanupEventListeners();
                    resolve();
                }, (err) => {
                    setError(err);
                    reject(new Error(err));
                });
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    }, [cleanupEventListeners]);
    const subscribe = (0, react_1.useCallback)(async (topic, qos = 1) => {
        if (!isConnected) {
            throw new Error('Not connected to MQTT broker');
        }
        await new Promise((resolve, reject) => {
            MqttModule.subscribeToTopic(topic, qos, () => resolve(), (err) => reject(new Error(err)));
        });
    }, [isConnected]);
    const unsubscribe = (0, react_1.useCallback)(async (topic) => {
        if (!isConnected) {
            throw new Error('Not connected to MQTT broker');
        }
        await new Promise((resolve, reject) => {
            MqttModule.unsubscribeFromTopic(topic, () => resolve(), (err) => reject(new Error(err)));
        });
    }, [isConnected]);
    const publish = (0, react_1.useCallback)(async (topic, message) => {
        if (!isConnected) {
            throw new Error('Not connected to MQTT broker');
        }
        await new Promise((resolve, reject) => {
            MqttModule.sendMessageToBroker(topic, message, () => resolve(), (err) => reject(new Error(err)));
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
exports.useMqtt = useMqtt;

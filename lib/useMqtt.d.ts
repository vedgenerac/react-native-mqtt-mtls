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
export declare const useMqtt: () => {
    isConnected: boolean;
    error: string;
    connect: (config: MqttConfig) => Promise<void>;
    disconnect: () => Promise<void>;
    subscribe: (topic: string, qos?: number) => Promise<void>;
    unsubscribe: (topic: string) => Promise<void>;
    publish: (topic: string, message: string) => Promise<void>;
};
//# sourceMappingURL=useMqtt.d.ts.map
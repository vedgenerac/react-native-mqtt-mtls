import { EmitterSubscription } from 'react-native';

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

export interface UseMqttReturn {
    isConnected: boolean;
    error: string | null;
    connect: (config: MqttConfig) => Promise<void>;
    disconnect: () => Promise<void>;
    subscribe: (topic: string, qos?: number) => Promise<void>;
    unsubscribe: (topic: string) => Promise<void>;
    publish: (topic: string, message: string) => Promise<void>;
}

export declare function useMqtt(): UseMqttReturn;
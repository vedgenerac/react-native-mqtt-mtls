# react-native-mqtt-mtls

React Native MQTT client with mutual TLS (mTLS) authentication support for Android.

## Installation

Install from GitHub repository:

```bash
npm install github:yourusername/react-native-mqtt-mtls
# or
yarn add github:yourusername/react-native-mqtt-mtls
```

Or add to your `package.json`:

```json
{
  "dependencies": {
    "react-native-mqtt-mtls": "github:yourusername/react-native-mqtt-mtls#main"
  }
}
```

## Android Setup

1. Add the package to your Android project's `settings.gradle`:

```gradle
include ':react-native-mqtt-mtls'
project(':react-native-mqtt-mtls').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-mqtt-mtls/android')
```

2. Add the package to your `MainApplication.java`:

```java
import com.reactnativemqttmtls.MqttPackage;

@Override
protected List<ReactPackage> getPackages() {
  return Arrays.asList(
    new MainReactPackage(),
    new MqttPackage() // Add this line
  );
}
```

## Usage

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useMqtt, MqttMessage } from 'react-native-mqtt-mtls';

const MyMqttScreen = () => {
  const { isConnected, error, connect, disconnect, subscribe, publish } = useMqtt();
  const [messages, setMessages] = useState<MqttMessage[]>([]);

  const handleConnect = async () => {
    try {
      await connect({
        broker: 'ssl://your-mqtt-broker.com:8883',
        clientId: 'my-client-id',
        clientCertPem: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
        privateKeyPem: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
        rootCaPem: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
        connectionTimeout: 30,
        keepAlive: 60,
        autoReconnect: true,
        onMessage: (message) => {
          console.log('Received message:', message);
          setMessages(prev => [...prev, message]);
        },
        onConnect: () => {
          console.log('Connected to MQTT broker');
        },
        onConnectionLost: (error) => {
          console.log('Connection lost:', error);
        },
        onReconnect: () => {
          console.log('Reconnected to MQTT broker');
        },
        onError: (error) => {
          console.error('MQTT Error:', error);
        },
      });
      
      // Subscribe to a topic after connecting
      await subscribe('my/topic', 1);
    } catch (err) {
      console.error('Failed to connect:', err);
    }
  };

  const handlePublish = async () => {
    try {
      await publish('my/topic', JSON.stringify({ hello: 'world' }));
    } catch (err) {
      console.error('Failed to publish:', err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MQTT mTLS Client</Text>
      <Text>Status: {isConnected ? 'Connected' : 'Disconnected'}</Text>
      {error && <Text style={styles.error}>Error: {error}</Text>}
      
      <View style={styles.buttonContainer}>
        <Button title="Connect" onPress={handleConnect} disabled={isConnected} />
        <Button title="Publish" onPress={handlePublish} disabled={!isConnected} />
        <Button title="Disconnect" onPress={handleDisconnect} disabled={!isConnected} />
      </View>

      <View style={styles.messagesContainer}>
        <Text style={styles.subtitle}>Messages:</Text>
        {messages.map((msg, idx) => (
          <Text key={idx} style={styles.message}>
            [{msg.topic}] {msg.message}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  error: {
    color: 'red',
    marginVertical: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  messagesContainer: {
    flex: 1,
  },
  message: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    marginVertical: 5,
    borderRadius: 5,
  },
});

export default MyMqttScreen;
```

## API

### `useMqtt()`

Returns an object with the following properties and methods:

#### Properties

- `isConnected: boolean` - Current connection status
- `error: string | null` - Last error message, if any

#### Methods

- `connect(config: MqttConfig): Promise<void>` - Connect to MQTT broker
- `disconnect(): Promise<void>` - Disconnect from MQTT broker
- `subscribe(topic: string, qos?: number): Promise<void>` - Subscribe to a topic (default QoS: 1)
- `unsubscribe(topic: string): Promise<void>` - Unsubscribe from a topic
- `publish(topic: string, message: string): Promise<void>` - Publish a message to a topic

### `MqttConfig`

```typescript
interface MqttConfig {
  broker: string;                    // MQTT broker URL (e.g., 'ssl://broker.com:8883')
  clientId: string;                  // Unique client identifier
  clientCertPem: string;             // Client certificate in PEM format
  privateKeyPem: string;             // Private key in PEM format
  rootCaPem: string;                 // Root CA certificate in PEM format
  connectionTimeout?: number;        // Connection timeout in seconds (default: 30)
  keepAlive?: number;                // Keep alive interval in seconds (default: 60)
  autoReconnect?: boolean;           // Enable automatic reconnection (default: true)
  onMessage?: (message: MqttMessage) => void;
  onConnect?: () => void;
  onConnectionLost?: (error: string) => void;
  onReconnect?: () => void;
  onError?: (error: string) => void;
}
```

### `MqttMessage`

```typescript
interface MqttMessage {
  topic: string;
  message: string;
  qos: number;
  retained: boolean;
}
```

## Features

- ✅ Mutual TLS (mTLS) authentication
- ✅ Automatic reconnection with exponential backoff
- ✅ Subscribe/Unsubscribe to topics
- ✅ Publish messages
- ✅ Connection state management
- ✅ Event callbacks for connection lifecycle
- ✅ React hooks API

## Dependencies

This package uses:
- Eclipse Paho MQTT Android client
- Bouncy Castle for certificate/key handling

## License

MIT
package com.reactnativemqttmtls;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.ByteArrayInputStream;
import java.io.StringReader;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManagerFactory;
import java.util.Base64;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import org.bouncycastle.asn1.pkcs.PrivateKeyInfo;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.openssl.PEMKeyPair;
import org.bouncycastle.openssl.PEMParser;
import org.bouncycastle.openssl.jcajce.JcaPEMKeyConverter;

import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.MqttCallback;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class MqttModule extends ReactContextBaseJavaModule {
    private static final String TAG = "MqttModule";

    private MqttClient mqttClient;
    private MqttConnectOptions connectOptions;
    private Map<String, Boolean> registeredEvents;
    private final ReactApplicationContext reactContext;
    private final Handler reconnectHandler;
    private Runnable reconnectRunnable;
    private boolean autoReconnect = false;
    private Set<String> subscribedTopics = new HashSet<>();
    private int reconnectAttempt = 0;

    public MqttModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        java.security.Security.addProvider(new BouncyCastleProvider());
        reconnectHandler = new Handler(Looper.getMainLooper());
        registeredEvents = new HashMap<>();
        Log.d(TAG, "MqttModule constructor called, module initialized");
    }

    @Override
    public void initialize() {
        super.initialize();
        Log.d(TAG, "MqttModule initialized in React Native environment");
    }

    @Override
    public String getName() {
        return "MqttModule";
    }

    @ReactMethod
    public void createMqttClient(
            String broker,
            String clientId,
            String clientCertPem,
            String privateKeyPem,
            String rootCaPem,
            Integer connectionTimeout,
            Integer keepAlive,
            boolean autoReconnect,
            Callback successCallback,
            Callback errorCallback) {
        try {
            Log.d(TAG, "Creating MQTT client for broker: " + broker + " with clientId: " + clientId + ", autoReconnect: " + autoReconnect);

            if (mqttClient != null) {
                throw new Exception("A client already exists");
            }

            this.autoReconnect = autoReconnect;

            SSLContext sslContext = getSSLContext(privateKeyPem, clientCertPem, rootCaPem);

            mqttClient = new MqttClient(broker, clientId, null);

            connectOptions = new MqttConnectOptions();
            connectOptions.setSocketFactory(sslContext.getSocketFactory());
            connectOptions.setKeepAliveInterval(keepAlive != null ? keepAlive : 60);
            connectOptions.setConnectionTimeout(connectionTimeout != null ? connectionTimeout : 30);
            connectOptions.setCleanSession(false);

            mqttClient.setCallback(new MqttCallback() {
                @Override
                public void connectionLost(Throwable cause) {
                    Log.e(TAG, "Connection lost: " + cause.getMessage());
                    if (registeredEvents.getOrDefault("connectionLost", false)) {
                        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                            .emit("MqttConnectionLost", cause.getMessage());
                    }
                    if (autoReconnect) {
                        scheduleReconnect();
                    }
                }

                @Override
                public void messageArrived(String topic, MqttMessage message) {
                    if (registeredEvents.getOrDefault("message", false)) {
                        String payload = new String(message.getPayload());
                        int qos = message.getQos();
                        boolean retained = message.isRetained();
                        String eventPayload = "{\"topic\": \"" + topic + "\", \"message\": \"" + payload + "\", \"qos\": " + qos + ", \"retained\": " + retained + "}";
                        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                            .emit("MqttMessage", eventPayload);
                    }
                }

                @Override
                public void deliveryComplete(IMqttDeliveryToken token) {
                    Log.d(TAG, "Delivery complete for published message");
                    if (registeredEvents.getOrDefault("deliveryComplete", false)) {
                        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                            .emit("MqttDeliveryComplete", "Message delivery complete");
                    }
                }
            });

            successCallback.invoke();
            Log.d(TAG, "MQTT client created successfully");
        } catch (Exception e) {
            errorCallback.invoke(e.getMessage());
            Log.e(TAG, "Client creation failed: " + e.getMessage(), e);
            if (registeredEvents.getOrDefault("error", false)) {
                reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("MqttError", "Client creation failed: " + e.getMessage());
            }
        }
    }

    @ReactMethod
    public void connect(Callback successCallback, Callback errorCallback) {
        try {
            if (mqttClient == null || connectOptions == null) {
                throw new Exception("No MQTT client created");
            }

            mqttClient.connect(connectOptions);
            successCallback.invoke();
            if (registeredEvents.getOrDefault("connect", false)) {
                reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("MqttConnect", "Connected to MQTT broker");
            }
            reconnectHandler.removeCallbacks(reconnectRunnable != null ? reconnectRunnable : () -> {});
            reconnectAttempt = 0;
            Log.d(TAG, "Connected to MQTT broker");
        } catch (Exception e) {
            errorCallback.invoke(e.getMessage());
            Log.e(TAG, "Connection failed: " + e.getMessage(), e);
            if (registeredEvents.getOrDefault("error", false)) {
                reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("MqttError", "Connection failed: " + e.getMessage());
            }
        }
    }

    @ReactMethod
    public void on(String event, Callback successCallback) {
        registeredEvents.put(event, true);
        successCallback.invoke("Registered for event: " + event);
        Log.d(TAG, "Registered JavaScript event: " + event);
    }

    @ReactMethod
    public void subscribeToTopic(String topic, int qos, Callback successCallback, Callback errorCallback) {
        try {
            if (mqttClient == null || !mqttClient.isConnected()) {
                throw new Exception("Not connected to MQTT broker");
            }
            mqttClient.subscribe(topic, qos);
            subscribedTopics.add(topic);
            successCallback.invoke("Subscribed to " + topic + " with QoS " + qos);
            Log.d(TAG, "Subscribed to topic: " + topic + " with QoS " + qos);
        } catch (Exception e) {
            errorCallback.invoke(e.getMessage());
            Log.e(TAG, "Subscribe failed: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void unsubscribeFromTopic(String topic, Callback successCallback, Callback errorCallback) {
        try {
            if (mqttClient == null || !mqttClient.isConnected()) {
                throw new Exception("Not connected to MQTT broker");
            }
            mqttClient.unsubscribe(topic);
            subscribedTopics.remove(topic);
            successCallback.invoke("Unsubscribed from " + topic);
            Log.d(TAG, "Unsubscribed from topic: " + topic);
        } catch (Exception e) {
            errorCallback.invoke(e.getMessage());
            Log.e(TAG, "Unsubscribe failed: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void sendMessageToBroker(String topic, String message, Callback successCallback, Callback errorCallback) {
        try {
            if (mqttClient == null || !mqttClient.isConnected()) {
                throw new Exception("Not connected to MQTT broker");
            }
            MqttMessage mqttMessage = new MqttMessage(message.getBytes());
            mqttMessage.setQos(1);
            // mqttMessage.setRetained(false);
            mqttClient.publish(topic, mqttMessage);
            successCallback.invoke("Published to " + topic);
            Log.d(TAG, "Published message to topic: " + topic);
        } catch (Exception e) {
            errorCallback.invoke(e.getMessage());
            Log.e(TAG, "Publish failed: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void end(Callback successCallback, Callback errorCallback) {
        try {
            if (mqttClient == null || !mqttClient.isConnected()) {
                successCallback.invoke("No active connection to disconnect");
                return;
            }
            mqttClient.disconnect();
            mqttClient.close();
            mqttClient = null;
            connectOptions = null;
            registeredEvents.clear();
            subscribedTopics.clear();
            reconnectHandler.removeCallbacks(reconnectRunnable != null ? reconnectRunnable : () -> {});
            reconnectAttempt = 0;
            successCallback.invoke("Closed MQTT connection");
            Log.d(TAG, "MQTT connection closed");
        } catch (Exception e) {
            errorCallback.invoke(e.getMessage());
            Log.e(TAG, "End failed: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void isConnected(Callback callback) {
        boolean connected = mqttClient != null && mqttClient.isConnected();
        callback.invoke(connected);
        Log.d(TAG, "isConnected: " + connected);
    }

    private SSLContext getSSLContext(String privateKeyPem, String clientCertPem, String rootCaPem) throws Exception {
        PrivateKey privateKey;
        try (PEMParser pemParser = new PEMParser(new StringReader(privateKeyPem))) {
            Object parsed;
            PrivateKeyInfo privateKeyInfo = null;
            while ((parsed = pemParser.readObject()) != null) {
                if (parsed instanceof PEMKeyPair) {
                    privateKeyInfo = ((PEMKeyPair) parsed).getPrivateKeyInfo();
                    break;
                } else if (parsed instanceof PrivateKeyInfo) {
                    privateKeyInfo = (PrivateKeyInfo) parsed;
                    break;
                }
            }
            if (privateKeyInfo == null) {
                throw new Exception("No valid private key found in PEM");
            }
            JcaPEMKeyConverter converter = new JcaPEMKeyConverter();
            privateKey = converter.getPrivateKey(privateKeyInfo);
        }

        CertificateFactory certFactory = CertificateFactory.getInstance("X.509");
        X509Certificate clientCert = (X509Certificate) certFactory.generateCertificate(
            new ByteArrayInputStream(Base64.getDecoder().decode(extractPemSection(clientCertPem)))
        );
        X509Certificate rootCa = (X509Certificate) certFactory.generateCertificate(
            new ByteArrayInputStream(Base64.getDecoder().decode(extractPemSection(rootCaPem)))
        );

        KeyStore keyStore = KeyStore.getInstance(KeyStore.getDefaultType());
        keyStore.load(null, null);
        keyStore.setKeyEntry("client", privateKey, null, new X509Certificate[]{clientCert});
        KeyManagerFactory kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        kmf.init(keyStore, null);

        KeyStore trustStore = KeyStore.getInstance(KeyStore.getDefaultType());
        trustStore.load(null, null);
        trustStore.setCertificateEntry("ca", rootCa);
        TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        tmf.init(trustStore);

        SSLContext sslContext = SSLContext.getInstance("TLS");
        sslContext.init(kmf.getKeyManagers(), tmf.getTrustManagers(), null);
        return sslContext;
    }

    private String extractPemSection(String pem) {
        return pem.replaceAll("-----BEGIN [^-]+-----", "")
                  .replaceAll("-----END [^-]+-----", "")
                  .replaceAll("\\s", "");
    }

    private void scheduleReconnect() {
        reconnectHandler.removeCallbacks(reconnectRunnable != null ? reconnectRunnable : () -> {});
        reconnectRunnable = () -> {
            if (mqttClient != null && !mqttClient.isConnected() && connectOptions != null) {
                try {
                    mqttClient.connect(connectOptions);
                    Log.d(TAG, "Auto-reconnected to MQTT broker");
                    for (String topic : subscribedTopics) {
                        mqttClient.subscribe(topic, 1);
                        Log.d(TAG, "Re-subscribed to topic: " + topic + " with QoS 1");
                    }
                    if (registeredEvents.getOrDefault("reconnect", false)) {
                        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                            .emit("MqttReconnect", "Auto-reconnected");
                    }
                    reconnectAttempt = 0;
                } catch (MqttException e) {
                    Log.e(TAG, "Auto-reconnect failed: " + e.getMessage(), e);
                    long delay = Math.min(60000, 5000 * (long) Math.pow(2, reconnectAttempt++));
                    reconnectHandler.postDelayed(reconnectRunnable, delay);
                    Log.d(TAG, "Scheduled reconnect attempt in " + delay + "ms");
                }
            }
        };
        reconnectHandler.postDelayed(reconnectRunnable, 5000);
        Log.d(TAG, "Scheduled initial reconnect attempt in 5000ms");
    }

    @ReactMethod
    public void addListener(String eventName) {
        Log.d(TAG, "addListener called for event: " + eventName);
    }

    @ReactMethod
    public void removeListeners(Integer count) {
        Log.d(TAG, "removeListeners called, count: " + count);
    }
}

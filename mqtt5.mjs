const QoS = {
    AT_MOST_ONCE: 0,
    AT_LEAST_ONCE: 1,
    EXACTRY_ONCE: 2
};
const ProtocolVersion = {
    MQTT_V3_1_1: 4,
    MQTT_V5: 5
};
const ReasonCode = {
    Success: 0,
    NormalDisconnection: 0,
    GrantedQoS0: 0,
    GrantedQoS1: 1,
    GrantedQoS2: 2,
    DisconnectWithWillMessage: 4,
    NoMatchingSubscribers: 16,
    NoSubscriptionExisted: 17,
    ContinueAuthentication: 24,
    ReAuthenticate: 25,
    UnspecifiedError: 128,
    MalformedPacket: 129,
    ProtocolError: 130,
    ImplementationSpecificError: 131,
    UnsupportedProtocolVersion: 132,
    ClientIdentifierNotValid: 133,
    BadUserNameOrPassword: 134,
    NotAuthorized: 135,
    ServerUnavailable: 136,
    ServerBusy: 137,
    Banned: 138,
    ServerShuttingDown: 139,
    BadAuthenticationMethod: 140,
    KeepAliveTimeout: 141,
    SessionTakenOver: 142,
    TopicFilterInvalid: 143,
    TopicNameInvalid: 144,
    PacketIdentifierInUse: 145,
    PacketIdentifierNotFound: 146,
    ReceiveMaximumExceeded: 147,
    TopicAliasInvalid: 148,
    PacketTooLarge: 149,
    MessageRateTooHigh: 150,
    QuotaExceeded: 151,
    AdministrativeAction: 152,
    PayloadFormatInvalid: 153,
    RetainNotSupported: 154,
    QoSNotSupported: 155,
    UseAnotherServer: 156,
    ServerMoved: 157,
    SharedSubscriptionsNotSupported: 158,
    ConnectionRateExceeded: 159,
    MaximumConnectTime: 160,
    SubscriptionIdentifiersNotSupported: 161,
    WildcardSubscriptionsNotSupported: 162
};
const V3_1_1_ConnectReturnCode = {
    ConnectionAccepted: 0,
    UnacceptableProtocolVersion: 1,
    IdentifierRejected: 2,
    ServerUnavailable: 3,
    BadUserNameOrPassword: 4,
    NotAuthorized: 5
};
const V3_1_1_SubscribeReturnCode = {
    Success_MaximumQoS0: 0,
    Success_MaximumQoS1: 1,
    Success_MaximumQoS2: 2,
    Failure: 128
};
const PacketType = {
    CONNECT: 0x1,
    CONNACK: 0x2,
    PUBLISH: 0x3,
    PUBACK: 0x4,
    PUBREC: 0x5,
    PUBREL: 0x6,
    PUBCOMP: 0x7,
    SUBSCRIBE: 0x8,
    SUBACK: 0x9,
    UNSUBSCRIBE: 0xA,
    UNSUBACK: 0xB,
    PINGREQ: 0xC,
    PINGRESP: 0xD,
    DISCONNECT: 0xE,
    AUTH: 0xF
};
const fixexHeaderFlag = {
    CONNECT: 0b0000,
    CONNACK: 0b0000,
    PUBACK: 0b0000,
    PUBREC: 0b0000,
    PUBREL: 0b0010,
    PUBCOMP: 0b0000,
    SUBSCRIBE: 0b0010,
    SUBACK: 0b0000,
    UNSUBSCRIBE: 0b0010,
    UNSUBACK: 0b0000,
    PINGREQ: 0b0000,
    PINGRESP: 0b0000,
    DISCONNECT: 0b0000,
    AUTH: 0b0000
};
const RetainHandling = {
    AtTheTimeOfTheSubscribe: 0,
    AtSubscribeOnlyIfTheSubscriptionDoesNotCurrentlyExist: 1,
    DoNotSend: 2
};
const mod = {
    QoS: QoS,
    ProtocolVersion: ProtocolVersion,
    ReasonCode: ReasonCode,
    V3_1_1_ConnectReturnCode: V3_1_1_ConnectReturnCode,
    V3_1_1_SubscribeReturnCode: V3_1_1_SubscribeReturnCode,
    PacketType: PacketType,
    fixexHeaderFlag: fixexHeaderFlag,
    RetainHandling: RetainHandling
};
class NumIsOutOfRange extends Error {
    #className = 'NumIsOutOfRange';
    constructor(){
        super('num is out of range');
    }
}
class InvalidVariableByteInteger extends Error {
    #className = 'InvalidVariableByteInteger';
    constructor(){
        super('invalid variable byte integer');
    }
}
class RemainingLengthError extends Error {
    #className = 'RemainingLengthError';
    constructor(message){
        super(`RemainingLengthError: ${message}`);
    }
}
const mod1 = {
    NumIsOutOfRange: NumIsOutOfRange,
    InvalidVariableByteInteger: InvalidVariableByteInteger,
    RemainingLengthError: RemainingLengthError
};
function numToTwoByteInteger(num) {
    if (num > 0xFFFF) {
        throw new NumIsOutOfRange();
    }
    return Uint8Array.from([
        num >> 8,
        num & 0xFF
    ]);
}
function twoByteIntegerToNum(buffer, offset) {
    return (buffer[offset] << 8) + buffer[offset + 1];
}
function numToFourByteInteger(num) {
    if (num > 0xFFFFFFFF) {
        throw new NumIsOutOfRange();
    }
    return Uint8Array.from([
        (num & 0xff000000) >> 24,
        (num & 0x00ff0000) >> 16,
        (num & 0x0000ff00) >> 8,
        num & 0x000000ff
    ]);
}
function fourByteIntegerToNum(buffer, offset) {
    return (buffer[offset] << 24) + (buffer[offset + 1] << 26) + (buffer[offset + 2] << 8) + buffer[offset + 3];
}
function stringToUtfEncodedString(str) {
    const bytes = new TextEncoder().encode(str);
    return new Uint8Array([
        ...numToTwoByteInteger(bytes.length),
        ...bytes
    ]);
}
function stringToBytes(str) {
    const bytes = new TextEncoder().encode(str);
    return new Uint8Array([
        ...bytes
    ]);
}
function utfEncodedStringToString(buffer, offset) {
    let pos = offset;
    const length = twoByteIntegerToNum(buffer, offset);
    pos += 2;
    const bytes = buffer.slice(pos, pos + length);
    const value = new TextDecoder().decode(bytes);
    return {
        length: length + 2,
        value
    };
}
function numToVariableByteInteger(num) {
    if (num > 268_435_455 || num < 0) {
        throw new NumIsOutOfRange();
    }
    const array = [];
    do {
        let __byte = num % 128;
        num = Math.floor(num / 128);
        if (num > 0) {
            __byte = __byte | 0b10000000;
        }
        array.push(__byte);
    }while (num > 0)
    return new Uint8Array(array);
}
function variableByteIntegerToNum(buffer, offset) {
    let i = offset;
    let __byte = 0;
    let value = 0;
    let multiplier = 1;
    do {
        __byte = buffer[i++];
        value += (__byte & 0b01111111) * multiplier;
        if (multiplier > 128 * 128 * 128) {
            throw new InvalidVariableByteInteger();
        }
        multiplier *= 128;
    }while ((__byte & 0b10000000) != 0)
    return {
        number: value,
        size: i - offset
    };
}
class InvalidQoSError extends Error {
    constructor(num){
        super(`invalid qos: ${num}`);
    }
}
function numToQoS(num) {
    if (num === 0 || num === 1 || num === 2) {
        return num;
    }
    throw new InvalidQoSError(num);
}
const mod2 = {
    MqttUtilsError: mod1,
    numToTwoByteInteger,
    twoByteIntegerToNum,
    numToFourByteInteger,
    fourByteIntegerToNum,
    stringToUtfEncodedString,
    stringToBytes,
    utfEncodedStringToString,
    numToVariableByteInteger,
    variableByteIntegerToNum,
    InvalidQoSError,
    numToQoS
};
class UnsuportedPropertyError extends Error {
    constructor(propertyId){
        super(`unsuported property. propertyId: ${propertyId}`);
    }
}
function propertiesToBytes(properties) {
    if (typeof properties === 'undefined') {
        return new Uint8Array([
            0x00
        ]);
    }
    const bytes = [];
    if (properties.payloadFormatIndicator) {
        bytes.push(0x01, properties.payloadFormatIndicator & 0xFF);
    }
    if (properties.messageExpiryInterval) {
        bytes.push(0x02, ...numToFourByteInteger(properties.messageExpiryInterval));
    }
    if (properties.contentType) {
        bytes.push(0x03, ...stringToUtfEncodedString(properties.contentType));
    }
    if (properties.responseTopic) {
        bytes.push(0x08, ...stringToUtfEncodedString(properties.responseTopic));
    }
    if (properties.correlationData) {
        const correlationDataLength = properties.correlationData.length;
        bytes.push(0x09, ...numToTwoByteInteger(correlationDataLength), ...properties.correlationData);
    }
    if (properties.subscriptionIdentifier) {
        bytes.push(0x0B, ...numToVariableByteInteger(properties.subscriptionIdentifier));
    }
    if (properties.sessionExpiryInterval) {
        bytes.push(0x11, ...numToFourByteInteger(properties.sessionExpiryInterval));
    }
    if (properties.assignedClientIdentifier) {
        bytes.push(0x12, ...stringToUtfEncodedString(properties.assignedClientIdentifier));
    }
    if (properties.serverKeepAlive) {
        bytes.push(0x13, ...numToTwoByteInteger(properties.serverKeepAlive));
    }
    if (properties.authenticationMethod) {
        bytes.push(0x15, ...stringToUtfEncodedString(properties.authenticationMethod));
    }
    if (properties.authenticationData) {
        const authenticationDataLength = properties.authenticationData.length;
        bytes.push(0x16, ...numToTwoByteInteger(authenticationDataLength), ...properties.authenticationData);
    }
    if (properties.requestProblemInformation) {
        bytes.push(0x17, properties.requestProblemInformation ? 1 : 0);
    }
    if (properties.willDelayInterval) {
        bytes.push(0x18, ...numToFourByteInteger(properties.willDelayInterval));
    }
    if (properties.requestResponseInformation) {
        bytes.push(0x19, properties.requestResponseInformation ? 1 : 0);
    }
    if (properties.responseInformation) {
        bytes.push(0x1A, ...stringToUtfEncodedString(properties.responseInformation));
    }
    if (properties.serverReference) {
        bytes.push(0x1C, ...stringToUtfEncodedString(properties.serverReference));
    }
    if (properties.reasonString) {
        bytes.push(0x1F, ...stringToUtfEncodedString(properties.reasonString));
    }
    if (properties.receiveMaximum) {
        bytes.push(0x21, ...numToTwoByteInteger(properties.receiveMaximum));
    }
    if (properties.topicAliasMaximum) {
        bytes.push(0x22, ...numToTwoByteInteger(properties.topicAliasMaximum));
    }
    if (properties.topicAlias) {
        bytes.push(0x23, ...numToTwoByteInteger(properties.topicAlias));
    }
    if (properties.maximumQoS) {
        bytes.push(0x24, properties.maximumQoS & 0xFF);
    }
    if (properties.retainAvailable) {
        bytes.push(0x25, properties.retainAvailable ? 1 : 0);
    }
    if (properties.userProperties) {
        if (properties.userProperties.length !== 0) {
            properties.userProperties.forEach((entry)=>{
                bytes.push(0x26);
                bytes.push(...stringToUtfEncodedString(entry.key));
                bytes.push(...stringToUtfEncodedString(entry.val));
            });
        }
    }
    if (properties.maximumPacketSize) {
        bytes.push(0x27, ...numToFourByteInteger(properties.maximumPacketSize));
    }
    if (properties.wildcardSubscriptionAvailable) {
        bytes.push(0x28, properties.wildcardSubscriptionAvailable ? 1 : 0);
    }
    if (properties.subscriptionIdentifiersAvailable) {
        bytes.push(0x29, properties.subscriptionIdentifiersAvailable ? 1 : 0);
    }
    if (properties.sharedSubscriptionAvailable) {
        bytes.push(0x2A, properties.sharedSubscriptionAvailable ? 1 : 0);
    }
    return new Uint8Array([
        ...numToVariableByteInteger(bytes.length),
        ...bytes
    ]);
}
function parseMqttProperties(buffer, offset, propertyLength) {
    const properties = {};
    let pos = offset;
    while(pos - offset < propertyLength){
        const { number: propertyId, size: propertyIdLength } = variableByteIntegerToNum(buffer, pos);
        pos += propertyIdLength;
        switch(propertyId){
            case 0x01:
                properties.payloadFormatIndicator = buffer[pos] & 0xFF;
                pos++;
                break;
            case 0x02:
                properties.messageExpiryInterval = fourByteIntegerToNum(buffer, pos);
                pos += 4;
                break;
            case 0x03:
                {
                    const contentTypeInfo = utfEncodedStringToString(buffer, pos);
                    properties.contentType = contentTypeInfo.value;
                    pos += contentTypeInfo.length;
                }
                break;
            case 0x08:
                {
                    const responseTopicInfo = utfEncodedStringToString(buffer, pos);
                    properties.responseTopic = responseTopicInfo.value;
                    pos += responseTopicInfo.length;
                }
                break;
            case 0x09:
                {
                    const correlationDataLength = twoByteIntegerToNum(buffer, pos);
                    pos += 2;
                    properties.correlationData = buffer.slice(pos, pos + correlationDataLength);
                    pos += correlationDataLength;
                }
                break;
            case 0x0B:
                {
                    const subscriptionIdentifierInfo = variableByteIntegerToNum(buffer, pos);
                    properties.subscriptionIdentifier = subscriptionIdentifierInfo.number;
                    pos += subscriptionIdentifierInfo.size;
                }
                break;
            case 0x11:
                properties.sessionExpiryInterval = fourByteIntegerToNum(buffer, pos);
                pos += 4;
                break;
            case 0x12:
                {
                    const assignedClientIdentifierInfo = utfEncodedStringToString(buffer, pos);
                    properties.assignedClientIdentifier = assignedClientIdentifierInfo.value;
                    pos += assignedClientIdentifierInfo.length;
                }
                break;
            case 0x13:
                properties.serverKeepAlive = twoByteIntegerToNum(buffer, pos);
                pos += 2;
                break;
            case 0x15:
                {
                    const authenticationMethodInfo = utfEncodedStringToString(buffer, pos);
                    properties.authenticationMethod = authenticationMethodInfo.value;
                    pos += authenticationMethodInfo.length;
                }
                break;
            case 0x16:
                {
                    const authenticationDataLength = twoByteIntegerToNum(buffer, pos);
                    pos += 2;
                    properties.authenticationData = buffer.slice(pos, pos + authenticationDataLength);
                    pos += authenticationDataLength;
                }
                break;
            case 0x17:
                properties.requestProblemInformation = buffer[pos++] === 1 ? true : false;
                break;
            case 0x18:
                properties.willDelayInterval = fourByteIntegerToNum(buffer, pos);
                pos += 4;
                break;
            case 0x19:
                properties.requestResponseInformation = buffer[pos++] === 1 ? true : false;
                break;
            case 0x1A:
                {
                    const responseInformationTypeInfo = utfEncodedStringToString(buffer, pos);
                    properties.responseInformation = responseInformationTypeInfo.value;
                    pos += responseInformationTypeInfo.length;
                }
                break;
            case 0x1C:
                {
                    const serverReferenceInfo = utfEncodedStringToString(buffer, pos);
                    properties.serverReference = serverReferenceInfo.value;
                    pos += serverReferenceInfo.length;
                }
                break;
            case 0x1F:
                {
                    const reasonStringInfo = utfEncodedStringToString(buffer, pos);
                    properties.reasonString = reasonStringInfo.value;
                    pos += reasonStringInfo.length;
                }
                break;
            case 0x21:
                properties.receiveMaximum = twoByteIntegerToNum(buffer, pos);
                pos += 2;
                break;
            case 0x22:
                properties.topicAliasMaximum = twoByteIntegerToNum(buffer, pos);
                pos += 2;
                break;
            case 0x23:
                properties.topicAlias = twoByteIntegerToNum(buffer, pos);
                pos += 2;
                break;
            case 0x24:
                properties.maximumQoS = numToQoS(buffer[pos++]);
                break;
            case 0x25:
                properties.retainAvailable = buffer[pos++] === 1 ? true : false;
                break;
            case 0x26:
                {
                    const keyInfo = utfEncodedStringToString(buffer, pos);
                    const key = keyInfo.value;
                    pos += keyInfo.length;
                    const valInfo = utfEncodedStringToString(buffer, pos);
                    const val = valInfo.value;
                    pos += valInfo.length;
                    if (properties.userProperties) {
                        properties.userProperties.push({
                            key,
                            val
                        });
                    } else {
                        properties.userProperties = [
                            {
                                key,
                                val
                            }
                        ];
                    }
                }
                break;
            case 0x27:
                properties.maximumPacketSize = fourByteIntegerToNum(buffer, pos);
                pos += 4;
                break;
            case 0x28:
                properties.wildcardSubscriptionAvailable = buffer[pos++] === 1 ? true : false;
                break;
            case 0x29:
                properties.subscriptionIdentifiersAvailable = buffer[pos++] === 1 ? true : false;
                break;
            case 0x2A:
                properties.sharedSubscriptionAvailable = buffer[pos++] === 1 ? true : false;
                break;
            default:
                throw new UnsuportedPropertyError(propertyId);
        }
    }
    return properties;
}
const mod3 = {
    UnsuportedPropertyError: UnsuportedPropertyError,
    propertiesToBytes: propertiesToBytes,
    parseMqttProperties: parseMqttProperties
};
class MqttPacketParseError extends Error {
    #className = 'MqttPacketParseError';
    constructor(message, options){
        super(message, options);
    }
}
class MqttPacketSerializeError extends Error {
    #className = 'MqttPacketSerializeError';
    constructor(message, options){
        super(message, options);
    }
}
class UnsuportedPacketError extends Error {
    #className = 'UnsuportedPacketError';
    constructor(packetType){
        super(`unsuported packet.  ${packetType}`);
    }
}
class InvalidProtocolVersionError extends Error {
    #className = 'InvalidProtocolVersionError';
    constructor(message){
        super(`invalid protocol version: ${message}`);
    }
}
const mod4 = {
    MqttPacketParseError: MqttPacketParseError,
    MqttPacketSerializeError: MqttPacketSerializeError,
    UnsuportedPacketError: UnsuportedPacketError,
    InvalidProtocolVersionError: InvalidProtocolVersionError
};
function toBytes(packet) {
    const protocolName = stringToUtfEncodedString('MQTT');
    const protocolVersion = packet.protocolVersion;
    const usernameFlag = packet.username ? true : false;
    const passwordFlag = packet.password ? true : false;
    const cleanSession = packet.clean || typeof packet.clean === 'undefined';
    const willFlag = packet.will ? true : false;
    const willRetain = packet.will?.retain ? true : false;
    const willQoS = packet.will?.qos || 0;
    const connectFlags = (usernameFlag ? 0b10000000 : 0) | (passwordFlag ? 0b01000000 : 0) | (willRetain ? 0b00100000 : 0) | (willQoS & 2 ? 0b00010000 : 0) | (willQoS & 1 ? 0b00001000 : 0) | (willFlag ? 0b00000100 : 0) | (cleanSession ? 0b00000010 : 0);
    const keepAlive = packet.keepAlive || 0;
    const variableHeader = [
        ...protocolName,
        protocolVersion,
        connectFlags,
        keepAlive >> 8,
        keepAlive & 0xFF
    ];
    if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
        variableHeader.push(...propertiesToBytes(packet.properties));
    }
    const payload = [
        ...stringToUtfEncodedString(packet.clientId)
    ];
    if (packet.will) {
        if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
            payload.push(...propertiesToBytes(packet.will.properties));
        }
        payload.push(...stringToUtfEncodedString(packet.will.topic));
        if (packet.will.payload) {
            payload.push(...numToTwoByteInteger(packet.will.payload.length));
            payload.push(...packet.will.payload);
        } else {
            payload.push(0x00, 0x00);
        }
    }
    if (packet.username) {
        payload.push(...stringToUtfEncodedString(packet.username));
    }
    if (packet.password) {
        payload.push(...stringToUtfEncodedString(packet.password));
    }
    const fixedHeader = [
        (PacketType.CONNECT << 4) + fixexHeaderFlag.CONNECT,
        ...numToVariableByteInteger(variableHeader.length + payload.length)
    ];
    return Uint8Array.from([
        ...fixedHeader,
        ...variableHeader,
        ...payload
    ]);
}
function parse(buffer, _remainingLength) {
    let pos = 0;
    const protocolName = utfEncodedStringToString(buffer, pos);
    pos += protocolName.length;
    const protocolVersion = buffer[pos++];
    const connectFlags = buffer[pos++];
    const usernameFlag = !!(connectFlags & 128);
    const passwordFlag = !!(connectFlags & 64);
    const willRetain = !!(connectFlags & 32);
    const willQoS = numToQoS((connectFlags & 16 + 8) >> 3);
    const willFlag = !!(connectFlags & 4);
    const cleanSession = !!(connectFlags & 2);
    if (protocolVersion != ProtocolVersion.MQTT_V3_1_1 && protocolVersion != ProtocolVersion.MQTT_V5) {
        throw new InvalidProtocolVersionError(`${protocolVersion}`);
    }
    const keepAlive = twoByteIntegerToNum(buffer, pos);
    pos += 2;
    const pV = protocolVersion;
    const properties = (()=>{
        if (pV > ProtocolVersion.MQTT_V3_1_1) {
            const { number: length, size: consumedBytesSize } = variableByteIntegerToNum(buffer, pos);
            pos += consumedBytesSize;
            if (length > 0) {
                const prop = parseMqttProperties(buffer, pos, length);
                pos += length;
                return prop;
            }
        }
        return undefined;
    })();
    const clientId = utfEncodedStringToString(buffer, pos);
    pos += clientId.length;
    let willProperties;
    let willTopic = '';
    let willPayload;
    if (willFlag) {
        willProperties = (()=>{
            if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
                const { number: length, size: consumedBytesSize } = variableByteIntegerToNum(buffer, pos);
                pos += consumedBytesSize;
                if (length > 0) {
                    const prop = parseMqttProperties(buffer, pos, length);
                    pos += length;
                    return prop;
                }
            }
            return undefined;
        })();
        const willTopicInfo = utfEncodedStringToString(buffer, pos);
        willTopic = willTopicInfo.value;
        pos += willTopicInfo.length;
        const payloadLength = twoByteIntegerToNum(buffer, pos);
        pos += 2;
        willPayload = buffer.slice(pos, pos + payloadLength);
        pos += payloadLength;
    }
    let username;
    let password;
    if (usernameFlag) {
        username = utfEncodedStringToString(buffer, pos);
        pos += username.length;
    }
    if (passwordFlag) {
        password = utfEncodedStringToString(buffer, pos);
        pos += password.length;
    }
    if (pV > ProtocolVersion.MQTT_V3_1_1) {
        return {
            type: 'connect',
            protocolName: protocolName.value,
            protocolVersion: pV,
            clientId: clientId.value,
            username: username ? username.value : undefined,
            password: password ? password.value : undefined,
            will: willFlag ? {
                retain: willRetain,
                qos: willQoS,
                topic: willTopic,
                payload: willPayload,
                properties: willProperties
            } : undefined,
            clean: cleanSession,
            keepAlive,
            properties
        };
    } else {
        return {
            type: 'connect',
            protocolName: protocolName.value,
            protocolVersion: pV,
            clientId: clientId.value,
            username: username ? username.value : undefined,
            password: password ? password.value : undefined,
            will: willFlag ? {
                retain: willRetain,
                qos: willQoS,
                topic: willTopic,
                payload: willPayload
            } : undefined,
            clean: cleanSession,
            keepAlive
        };
    }
}
function toBytes1(packet, protocolVersion) {
    const variableHeader = [];
    variableHeader.push(packet.sessionPresent ? 1 : 0);
    if (protocolVersion > 4) {
        const reasonCode = packet.reasonCode || 0x00;
        variableHeader.push(reasonCode & 0xFF);
        variableHeader.push(...propertiesToBytes(packet.properties));
    } else {
        const returnCode = packet.returnCode || 0x00;
        variableHeader.push(returnCode & 0xFF);
    }
    const fixedHeader = [
        (PacketType.CONNACK << 4) + fixexHeaderFlag.CONNACK,
        ...numToVariableByteInteger(variableHeader.length)
    ];
    return Uint8Array.from([
        ...fixedHeader,
        ...variableHeader
    ]);
}
function parse1(buffer, remainingLength, protocolVersion) {
    let pos = 0;
    if (remainingLength < 2) {
        throw Error('malformed length');
    }
    const sessionPresent = (buffer[pos++] & 0b00000001) === 0 ? false : true;
    const rc = buffer[pos++];
    if (protocolVersion === ProtocolVersion.MQTT_V3_1_1) {
        const returnCode = rc;
        return {
            type: 'connack',
            sessionPresent,
            returnCode
        };
    }
    const reasonCode = rc;
    const properties = (()=>{
        const { number: length, size: consumedBytesSize } = variableByteIntegerToNum(buffer, pos);
        pos += consumedBytesSize;
        if (length > 0) {
            const prop = parseMqttProperties(buffer, pos, length);
            pos += length;
            return prop;
        }
        return undefined;
    })();
    if (properties) {
        return {
            type: 'connack',
            sessionPresent: sessionPresent,
            reasonCode: reasonCode,
            properties: properties
        };
    } else {
        return {
            type: 'connack',
            sessionPresent: sessionPresent,
            reasonCode: reasonCode
        };
    }
}
function toBytes2(packet, protocolVersion) {
    const qos = packet.qos || QoS.AT_MOST_ONCE;
    const flags = (packet.dup ? 0b1000 : 0) + (qos << 1) + (packet.retain ? 1 : 0);
    const variableHeader = [
        ...stringToUtfEncodedString(packet.topic)
    ];
    if (qos === QoS.AT_LEAST_ONCE || qos === QoS.EXACTRY_ONCE) {
        variableHeader.push(...numToTwoByteInteger(packet.packetId));
    }
    if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
        variableHeader.push(...propertiesToBytes(packet.properties));
    }
    let payload = packet.payload;
    if (typeof payload === 'string') {
        payload = stringToBytes(payload);
    }
    const fixedHeader = [
        (PacketType.PUBLISH << 4) + flags,
        ...numToVariableByteInteger(variableHeader.length + payload.length)
    ];
    return Uint8Array.from([
        ...fixedHeader,
        ...variableHeader,
        ...payload
    ]);
}
function parse2(packetFlags, buffer, remainingLength, protocolVersion) {
    const flags = packetFlags & 0x0f;
    const dup = (flags & 0b1000) == 0b1000 ? true : false;
    const qos = numToQoS((flags & 0b0110) >> 1);
    const retain = (flags & 0b0001) == 0b0001 ? true : false;
    let pos = 0;
    const topicInfo = utfEncodedStringToString(buffer, pos);
    const topic = topicInfo.value;
    pos += topicInfo.length;
    const packetId = (()=>{
        if (qos === QoS.AT_LEAST_ONCE || qos == QoS.EXACTRY_ONCE) {
            const id = twoByteIntegerToNum(buffer, pos);
            pos += 2;
            return id;
        } else {
            return undefined;
        }
    })();
    const properties = (()=>{
        if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
            const { number: length, size: consumedBytesSize } = variableByteIntegerToNum(buffer, pos);
            pos += consumedBytesSize;
            if (length > 0) {
                const prop = parseMqttProperties(buffer, pos, length);
                pos += length;
                return prop;
            }
            return undefined;
        }
    })();
    const payload = buffer.slice(pos, remainingLength);
    return {
        type: 'publish',
        topic,
        payload,
        dup,
        retain,
        qos,
        packetId,
        properties: properties
    };
}
function toBytes3(packet, protocolVersion) {
    const variableHeader = [
        ...numToTwoByteInteger(packet.packetId)
    ];
    if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
        const reasonCode = packet.reasonCode || 0x00;
        if (packet.properties) {
            variableHeader.push(reasonCode & 0xFF);
            variableHeader.push(...propertiesToBytes(packet.properties));
        } else {
            if (reasonCode != 0x00) {
                variableHeader.push(reasonCode & 0xFF);
            }
        }
    }
    const fixedHeader = [
        (PacketType.PUBACK << 4) + fixexHeaderFlag.PUBACK,
        ...numToVariableByteInteger(variableHeader.length)
    ];
    return Uint8Array.from([
        ...fixedHeader,
        ...variableHeader
    ]);
}
function parse3(buffer, remainingLength, protocolVersion) {
    let pos = 0;
    if (remainingLength < 2) {
        throw new mod1.RemainingLengthError('puback packet');
    }
    const packetId = twoByteIntegerToNum(buffer, pos);
    pos += 2;
    if (protocolVersion === ProtocolVersion.MQTT_V3_1_1 || remainingLength == pos) {
        return {
            type: 'puback',
            packetId: packetId
        };
    }
    const reasonCode = buffer[pos++];
    if (remainingLength == pos) {
        return {
            type: 'puback',
            packetId: packetId,
            reasonCode: reasonCode
        };
    }
    const properties = (()=>{
        const { number: length, size: consumedBytesSize } = variableByteIntegerToNum(buffer, pos);
        pos += consumedBytesSize;
        const prop = parseMqttProperties(buffer, pos, length);
        pos += length;
        return prop;
    })();
    return {
        type: 'puback',
        packetId: packetId,
        reasonCode: reasonCode,
        properties: properties
    };
}
function toBytes4(packet, protocolVersion) {
    const variableHeader = [
        ...numToTwoByteInteger(packet.packetId)
    ];
    if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
        const reasonCode = packet.reasonCode || 0x00;
        if (packet.properties) {
            variableHeader.push(reasonCode & 0xFF);
            variableHeader.push(...propertiesToBytes(packet.properties));
        } else {
            if (reasonCode != 0x00) {
                variableHeader.push(reasonCode & 0xFF);
            }
        }
    }
    const fixedHeader = [
        (PacketType.PUBREC << 4) + fixexHeaderFlag.PUBREC,
        ...numToVariableByteInteger(variableHeader.length)
    ];
    return Uint8Array.from([
        ...fixedHeader,
        ...variableHeader
    ]);
}
function parse4(buffer, remainingLength, protocolVersion) {
    let pos = 0;
    if (remainingLength < 2) {
        throw new mod1.RemainingLengthError('pubrec packet');
    }
    const packetId = twoByteIntegerToNum(buffer, pos);
    pos += 2;
    if (protocolVersion === ProtocolVersion.MQTT_V3_1_1 || remainingLength == pos) {
        return {
            type: 'pubrec',
            packetId: packetId
        };
    }
    const reasonCode = buffer[pos++];
    if (remainingLength == pos) {
        return {
            type: 'pubrec',
            packetId: packetId,
            reasonCode: reasonCode
        };
    }
    const properties = (()=>{
        const { number: length, size: consumedBytesSize } = variableByteIntegerToNum(buffer, pos);
        pos += consumedBytesSize;
        const prop = parseMqttProperties(buffer, pos, length);
        pos += length;
        return prop;
    })();
    return {
        type: 'pubrec',
        packetId: packetId,
        reasonCode: reasonCode,
        properties: properties
    };
}
function toBytes5(packet, protocolVersion) {
    const variableHeader = [
        ...numToTwoByteInteger(packet.packetId)
    ];
    if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
        const reasonCode = packet.reasonCode || 0x00;
        if (packet.properties) {
            variableHeader.push(reasonCode & 0xFF);
            variableHeader.push(...propertiesToBytes(packet.properties));
        } else {
            if (reasonCode != 0x00) {
                variableHeader.push(reasonCode & 0xFF);
            }
        }
    }
    const fixedHeader = [
        (PacketType.PUBREL << 4) + fixexHeaderFlag.PUBREL,
        ...numToVariableByteInteger(variableHeader.length)
    ];
    return Uint8Array.from([
        ...fixedHeader,
        ...variableHeader
    ]);
}
function parse5(buffer, remainingLength, protocolVersion) {
    let pos = 0;
    if (remainingLength < 2) {
        throw new mod1.RemainingLengthError('pubrec packet');
    }
    const packetId = twoByteIntegerToNum(buffer, pos);
    pos += 2;
    if (protocolVersion === ProtocolVersion.MQTT_V3_1_1 || remainingLength == pos) {
        return {
            type: 'pubrel',
            packetId: packetId
        };
    }
    const reasonCode = buffer[pos++];
    if (remainingLength == pos) {
        return {
            type: 'pubrel',
            packetId: packetId,
            reasonCode: reasonCode
        };
    }
    const properties = (()=>{
        const { number: length, size: consumedBytesSize } = variableByteIntegerToNum(buffer, pos);
        pos += consumedBytesSize;
        const prop = parseMqttProperties(buffer, pos, length);
        pos += length;
        return prop;
    })();
    return {
        type: 'pubrel',
        packetId: packetId,
        reasonCode: reasonCode,
        properties: properties
    };
}
function toBytes6(packet, protocolVersion) {
    const variableHeader = [
        ...numToTwoByteInteger(packet.packetId)
    ];
    if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
        const reasonCode = packet.reasonCode || 0x00;
        if (packet.properties) {
            variableHeader.push(reasonCode & 0xFF);
            variableHeader.push(...propertiesToBytes(packet.properties));
        } else {
            if (reasonCode != 0x00) {
                variableHeader.push(reasonCode & 0xFF);
            }
        }
    }
    const fixedHeader = [
        (PacketType.PUBCOMP << 4) + fixexHeaderFlag.PUBCOMP,
        ...numToVariableByteInteger(variableHeader.length)
    ];
    return Uint8Array.from([
        ...fixedHeader,
        ...variableHeader
    ]);
}
function parse6(buffer, remainingLength, protocolVersion) {
    let pos = 0;
    if (remainingLength < 2) {
        throw new mod1.RemainingLengthError('pubcomp packet');
    }
    const packetId = twoByteIntegerToNum(buffer, pos);
    pos += 2;
    if (protocolVersion === ProtocolVersion.MQTT_V3_1_1 || remainingLength == pos) {
        return {
            type: 'pubcomp',
            packetId: packetId
        };
    }
    const reasonCode = buffer[pos++];
    if (remainingLength == pos) {
        return {
            type: 'pubcomp',
            packetId: packetId,
            reasonCode: reasonCode
        };
    }
    const properties = (()=>{
        const { number: length, size: consumedBytesSize } = variableByteIntegerToNum(buffer, pos);
        pos += consumedBytesSize;
        const prop = parseMqttProperties(buffer, pos, length);
        pos += length;
        return prop;
    })();
    return {
        type: 'pubcomp',
        packetId: packetId,
        reasonCode: reasonCode,
        properties: properties
    };
}
function toBytes7(packet, protocolVersion) {
    const variableHeader = [
        ...numToTwoByteInteger(packet.packetId)
    ];
    if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
        if (packet.properties) {
            variableHeader.push(...propertiesToBytes(packet.properties));
        } else {
            variableHeader.push(0x00);
        }
    }
    const payload = [];
    for (const sub of packet.subscriptions){
        if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
            const subscriptionOptions = (sub.retainHandling ? sub.retainHandling << 4 : 0) | (sub.retainAsPublished ? 0b00001000 : 0) | (sub.noLocal ? 0b00000100 : 0) | (sub.qos === QoS.EXACTRY_ONCE ? 0b00000010 : 0) | (sub.qos === QoS.AT_LEAST_ONCE ? 0b00000001 : 0);
            payload.push(...stringToUtfEncodedString(sub.topicFilter), subscriptionOptions);
        } else {
            payload.push(...stringToUtfEncodedString(sub.topicFilter), sub.qos);
        }
    }
    const fixedHeader = [
        (PacketType.SUBSCRIBE << 4) + fixexHeaderFlag.SUBSCRIBE,
        ...numToVariableByteInteger(variableHeader.length + payload.length)
    ];
    return Uint8Array.from([
        ...fixedHeader,
        ...variableHeader,
        ...payload
    ]);
}
function parse7(buffer, remainingLength, protocolVersion) {
    let pos = 0;
    const packetId = (buffer[pos++] << 8) + buffer[pos++];
    const properties = (()=>{
        if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
            const { number: length, size: consumedBytesSize } = variableByteIntegerToNum(buffer, pos);
            pos += consumedBytesSize;
            const prop = parseMqttProperties(buffer, pos, length);
            pos += length;
            return prop;
        } else {
            return undefined;
        }
    })();
    const subscriptions = [];
    do {
        const topicFilterInfo = utfEncodedStringToString(buffer, pos);
        pos += topicFilterInfo.length;
        if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
            const subscribeOptions = buffer[pos++];
            const retainHandling = (()=>{
                const retainHandlingVal = (subscribeOptions & 0b00110000) >> 4;
                return retainHandlingVal;
            })();
            subscriptions.push({
                topicFilter: topicFilterInfo.value,
                qos: numToQoS(subscribeOptions & 0b00000011),
                retainHandling: retainHandling,
                retainAsPublished: (subscribeOptions & 0b00001000) === 0b00000000 ? false : true,
                noLocal: (subscribeOptions & 0b00000100) === 0b00000000 ? false : true
            });
        } else {
            subscriptions.push({
                topicFilter: topicFilterInfo.value,
                qos: numToQoS(buffer[pos++])
            });
        }
    }while (pos < remainingLength)
    if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
        return {
            type: 'subscribe',
            packetId,
            subscriptions,
            properties: properties
        };
    } else {
        return {
            type: 'subscribe',
            packetId,
            subscriptions
        };
    }
}
function toBytes8(packet, protocolVersion) {
    const variableHeader = [
        ...numToTwoByteInteger(packet.packetId)
    ];
    if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
        variableHeader.push(...propertiesToBytes(packet.properties));
    }
    const payload = protocolVersion > ProtocolVersion.MQTT_V3_1_1 ? packet.reasonCodes : packet.returnCodes;
    const fixedHeader = [
        (PacketType.SUBACK << 4) + fixexHeaderFlag.SUBACK,
        ...numToVariableByteInteger(variableHeader.length + payload.length)
    ];
    return Uint8Array.from([
        ...fixedHeader,
        ...variableHeader,
        ...payload
    ]);
}
function parse8(buffer, remainingLength, protocolVersion) {
    let pos = 0;
    const packetId = twoByteIntegerToNum(buffer, pos);
    pos += 2;
    const properties = (()=>{
        if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
            const { number: length, size: consumedBytesSize } = variableByteIntegerToNum(buffer, pos);
            pos += consumedBytesSize;
            const prop = parseMqttProperties(buffer, pos, length);
            pos += length;
            return prop;
        } else {
            return undefined;
        }
    })();
    const rc = [];
    const payloadEnd = remainingLength;
    for(let i = pos; i < payloadEnd; i++){
        rc.push(buffer[i]);
    }
    if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
        return {
            type: 'suback',
            packetId: packetId,
            reasonCodes: protocolVersion > 4 ? rc : undefined,
            properties: properties
        };
    } else {
        return {
            type: 'suback',
            packetId: packetId,
            returnCodes: !(protocolVersion > 4) ? rc : undefined
        };
    }
}
function toBytes9(packet, protocolVersion) {
    const variableHeader = [
        ...numToTwoByteInteger(packet.packetId)
    ];
    if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
        if (packet.properties) {
            variableHeader.push(...propertiesToBytes(packet.properties));
        } else {
            variableHeader.push(0x00);
        }
    }
    const payload = [];
    for (const topic of packet.topicFilters){
        payload.push(...stringToUtfEncodedString(topic));
    }
    const fixedHeader = [
        (PacketType.UNSUBSCRIBE << 4) + fixexHeaderFlag.UNSUBSCRIBE,
        ...numToVariableByteInteger(variableHeader.length + payload.length)
    ];
    return Uint8Array.from([
        ...fixedHeader,
        ...variableHeader,
        ...payload
    ]);
}
function parse9(buffer, remainingLength, protocolVersion) {
    let pos = 0;
    const packetId = (buffer[pos++] << 8) + buffer[pos++];
    const properties = (()=>{
        if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
            const { number: length, size: consumedBytesSize } = variableByteIntegerToNum(buffer, pos);
            pos += consumedBytesSize;
            const prop = parseMqttProperties(buffer, pos, length);
            pos += length;
            return prop;
        } else {
            return undefined;
        }
    })();
    const topicFilters = [];
    while(pos < remainingLength){
        const topicFilter = utfEncodedStringToString(buffer, pos);
        pos += topicFilter.length;
        topicFilters.push(topicFilter.value);
    }
    if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
        return {
            type: 'unsubscribe',
            packetId,
            topicFilters,
            properties: properties
        };
    } else {
        return {
            type: 'unsubscribe',
            packetId,
            topicFilters
        };
    }
}
function toBytes10(packet, protocolVersion) {
    const variableHeader = [
        ...numToTwoByteInteger(packet.packetId)
    ];
    if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
        variableHeader.push(...propertiesToBytes(packet.properties));
    }
    if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
        const payload = packet.reasonCodes;
        const fixedHeader = [
            (PacketType.UNSUBACK << 4) + fixexHeaderFlag.UNSUBACK,
            ...numToVariableByteInteger(variableHeader.length + payload.length)
        ];
        return Uint8Array.from([
            ...fixedHeader,
            ...variableHeader,
            ...payload
        ]);
    } else {
        const fixedHeader = [
            (PacketType.UNSUBACK << 4) + fixexHeaderFlag.UNSUBACK,
            ...numToVariableByteInteger(variableHeader.length)
        ];
        return Uint8Array.from([
            ...fixedHeader,
            ...variableHeader
        ]);
    }
}
function parse10(buffer, remainingLength, protocolVersion) {
    let pos = 0;
    const packetId = twoByteIntegerToNum(buffer, pos);
    pos += 2;
    if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
        const properties = (()=>{
            const { number: length, size: consumedBytesSize } = variableByteIntegerToNum(buffer, pos);
            pos += consumedBytesSize;
            const prop = parseMqttProperties(buffer, pos, length);
            pos += length;
            return prop;
        })();
        const reasonCodes = [];
        while(pos < remainingLength){
            reasonCodes.push(buffer[pos++]);
        }
        return {
            type: 'unsuback',
            packetId: packetId,
            reasonCodes: reasonCodes,
            properties: properties
        };
    } else {
        return {
            type: 'unsuback',
            packetId: packetId
        };
    }
}
function toBytes11(_packet) {
    const fixedHeader = [
        (PacketType.PINGREQ << 4) + fixexHeaderFlag.PINGREQ,
        0
    ];
    return Uint8Array.from([
        ...fixedHeader
    ]);
}
function parse11(remainingLength) {
    if (remainingLength > 0) {
        throw Error('malformed length');
    }
    return {
        type: 'pingreq'
    };
}
function toBytes12(_packet) {
    const fixedHeader = [
        (PacketType.PINGRESP << 4) + fixexHeaderFlag.PINGRESP,
        0
    ];
    return Uint8Array.from([
        ...fixedHeader
    ]);
}
function parse12(remainingLength) {
    if (remainingLength > 0) {
        throw Error('malformed length');
    }
    return {
        type: 'pingresp'
    };
}
function toBytes13(packet, protocolVersion) {
    const variableHeader = [];
    if (protocolVersion > ProtocolVersion.MQTT_V3_1_1) {
        const reasonCode = packet.reasonCode || 0x00;
        if (packet.properties) {
            variableHeader.push(reasonCode & 0xFF);
            variableHeader.push(...propertiesToBytes(packet.properties));
        } else {
            if (reasonCode != 0x00) {
                variableHeader.push(reasonCode & 0xFF);
            }
        }
    }
    const fixedHeader = [
        (PacketType.DISCONNECT << 4) + fixexHeaderFlag.DISCONNECT,
        ...numToVariableByteInteger(variableHeader.length)
    ];
    return Uint8Array.from([
        ...fixedHeader,
        ...variableHeader
    ]);
}
function parse13(buffer, remainingLength, protocolVersion) {
    if (protocolVersion === ProtocolVersion.MQTT_V3_1_1) {
        return {
            type: 'disconnect'
        };
    }
    let pos = 0;
    const reasonCode = buffer[pos++];
    if (remainingLength == pos) {
        return {
            type: 'disconnect',
            reasonCode: reasonCode
        };
    }
    const properties = (()=>{
        const { number: length, size: consumedBytesSize } = variableByteIntegerToNum(buffer, pos);
        pos += consumedBytesSize;
        const prop = parseMqttProperties(buffer, pos, length);
        pos += length;
        return prop;
    })();
    return {
        type: 'disconnect',
        reasonCode: reasonCode,
        properties: properties
    };
}
function toBytes14(packet, _protocolVersion) {
    const variableHeader = [];
    const reasonCode = packet.reasonCode || 0x00;
    if (packet.properties) {
        variableHeader.push(reasonCode & 0xFF);
        variableHeader.push(...propertiesToBytes(packet.properties));
    } else {
        if (reasonCode != 0x00) {
            variableHeader.push(reasonCode & 0xFF);
        }
    }
    const fixedHeader = [
        (PacketType.AUTH << 4) + fixexHeaderFlag.AUTH,
        ...numToVariableByteInteger(variableHeader.length)
    ];
    return Uint8Array.from([
        ...fixedHeader,
        ...variableHeader
    ]);
}
function parse14(buffer, remainingLength, _protocolVersion) {
    let pos = 0;
    if (remainingLength == 0) {
        return {
            type: 'auth',
            reasonCode: ReasonCode.Success
        };
    }
    const reasonCode = buffer[pos++] & 0xFF;
    if (remainingLength > pos) {
        const properties = (()=>{
            const { number: length, size: consumedBytesSize } = variableByteIntegerToNum(buffer, pos);
            pos += consumedBytesSize;
            const prop = parseMqttProperties(buffer, pos, length);
            pos += length;
            return prop;
        })();
        return {
            type: 'auth',
            reasonCode,
            properties
        };
    }
    return {
        type: 'auth',
        reasonCode
    };
}
function packetToBytes(packet, protocolVersion) {
    try {
        let bytes;
        switch(packet.type){
            case 'connect':
                bytes = toBytes(packet);
                break;
            case 'connack':
                bytes = toBytes1(packet, protocolVersion);
                break;
            case 'publish':
                bytes = toBytes2(packet, protocolVersion);
                break;
            case 'puback':
                bytes = toBytes3(packet, protocolVersion);
                break;
            case 'pubrec':
                bytes = toBytes4(packet, protocolVersion);
                break;
            case 'pubrel':
                bytes = toBytes5(packet, protocolVersion);
                break;
            case 'pubcomp':
                bytes = toBytes6(packet, protocolVersion);
                break;
            case 'subscribe':
                bytes = toBytes7(packet, protocolVersion);
                break;
            case 'suback':
                bytes = toBytes8(packet, protocolVersion);
                break;
            case 'unsubscribe':
                bytes = toBytes9(packet, protocolVersion);
                break;
            case 'unsuback':
                bytes = toBytes10(packet, protocolVersion);
                break;
            case 'pingreq':
                bytes = toBytes11(packet);
                break;
            case 'pingresp':
                bytes = toBytes12(packet);
                break;
            case 'disconnect':
                bytes = toBytes13(packet, protocolVersion);
                break;
            case 'auth':
                bytes = toBytes14(packet, protocolVersion);
                break;
            default:
                throw new UnsuportedPacketError('unknown');
        }
        return bytes;
    } catch (err) {
        throw new MqttPacketSerializeError('mqtt packet serialize error.', {
            cause: err
        });
    }
}
function decode(buffer, protocolVersion = ProtocolVersion.MQTT_V5) {
    let pos = 0;
    try {
        const packetType = buffer[pos] >> 4;
        const packetFlags = buffer[pos++] & 0b00001111;
        const remainingLengthBytes = [];
        let readLength = 0;
        do {
            const readValue = buffer[pos++];
            readLength++;
            remainingLengthBytes.push(readValue);
            if (readValue >> 7 == 0) {
                break;
            } else if (readLength == 4) {
                throw new Error('malformed packet');
            }
        }while (readLength < 4)
        const remainingLength = variableByteIntegerToNum(new Uint8Array([
            ...remainingLengthBytes
        ]), 0);
        let variableHeaderAndPayload = new Uint8Array(0);
        if (remainingLength.number > 0) {
            variableHeaderAndPayload = new Uint8Array(buffer.slice(pos));
        }
        const packet = parsePacket(packetType, packetFlags, remainingLength.number, variableHeaderAndPayload, protocolVersion);
        return packet;
    } catch (err) {
        throw new MqttPacketParseError('mqtt packet parse error.', {
            cause: err
        });
    }
}
function parsePacket(packetTypeId, packetFlags, remainingLength, variableHeaderAndPayload, protocolVersion) {
    let packet;
    switch(packetTypeId){
        case PacketType.CONNECT:
            packet = parse(variableHeaderAndPayload, remainingLength);
            break;
        case PacketType.CONNACK:
            packet = parse1(variableHeaderAndPayload, remainingLength, protocolVersion);
            break;
        case PacketType.PUBLISH:
            packet = parse2(packetFlags, variableHeaderAndPayload, remainingLength, protocolVersion);
            break;
        case PacketType.PUBACK:
            packet = parse3(variableHeaderAndPayload, remainingLength, protocolVersion);
            break;
        case PacketType.PUBREC:
            packet = parse4(variableHeaderAndPayload, remainingLength, protocolVersion);
            break;
        case PacketType.PUBREL:
            packet = parse5(variableHeaderAndPayload, remainingLength, protocolVersion);
            break;
        case PacketType.PUBCOMP:
            packet = parse6(variableHeaderAndPayload, remainingLength, protocolVersion);
            break;
        case PacketType.SUBSCRIBE:
            packet = parse7(variableHeaderAndPayload, remainingLength, protocolVersion);
            break;
        case PacketType.SUBACK:
            packet = parse8(variableHeaderAndPayload, remainingLength, protocolVersion);
            break;
        case PacketType.UNSUBSCRIBE:
            packet = parse9(variableHeaderAndPayload, remainingLength, protocolVersion);
            break;
        case PacketType.UNSUBACK:
            packet = parse10(variableHeaderAndPayload, remainingLength, protocolVersion);
            break;
        case PacketType.PINGREQ:
            packet = parse11(remainingLength);
            break;
        case PacketType.PINGRESP:
            packet = parse12(remainingLength);
            break;
        case PacketType.DISCONNECT:
            packet = parse13(variableHeaderAndPayload, remainingLength, protocolVersion);
            break;
        case PacketType.AUTH:
            packet = parse14(variableHeaderAndPayload, remainingLength, protocolVersion);
            break;
        default:
            throw new UnsuportedPacketError('unknown');
    }
    return packet;
}
const mod5 = {
    MqttPacketsError: mod4,
    packetToBytes: packetToBytes,
    decode: decode
};
const mod6 = {};
class ReuseIdProvider {
    _start;
    _end;
    _use = [];
    _reuse = [];
    _reusable = [];
    _next;
    constructor(start, end){
        if (start >= end) {
            throw new Error('Invalid argument');
        }
        this._start = start;
        this._end = end;
        this._use = [];
        this._reuse = [];
        this._reusable = [];
        this._next = this._start;
    }
    clear() {
        this._use = [];
        this._reuse = [];
        this._reusable = [];
        this._next = this._start;
    }
    aquire() {
        let id = this._reusable.shift();
        if (id) {
            this._reuse.push(id);
        } else {
            if (this._next > this._end) {
                throw new Error('Unable to obtain ID because the limit has been reached');
            }
            id = this._next++;
            this._use.push(id);
        }
        return id;
    }
    release(id) {
        let index = this._reuse.findIndex((v)=>v === id);
        if (index >= 0) {
            this._reuse.splice(index, 1);
            if (this._next == id + 1) {
                this._next--;
            } else {
                this._reusable.push(id);
            }
            return true;
        }
        index = this._use.findIndex((v)=>v === id);
        if (index >= 0) {
            this._use.splice(index, 1);
            this._reusable.push(id);
            return true;
        }
        return false;
    }
    inUse(id) {
        let index = this._reuse.findIndex((v)=>v === id);
        if (index >= 0) {
            return true;
        }
        index = this._use.findIndex((v)=>v === id);
        if (index >= 0) {
            return true;
        }
        return false;
    }
}
const mod7 = {
    ReuseIdProvider
};
var _computedKey;
_computedKey = Symbol.iterator;
class LruCache {
    _capacity;
    _maxAge;
    _values;
    _ages;
    constructor(capacity, maxAge = Number.MAX_VALUE){
        this._capacity = capacity;
        this._maxAge = maxAge;
        this._values = new Map();
        this._ages = new Map();
    }
    *[_computedKey]() {
        for (const val of this._values.entries()){
            yield val;
        }
    }
    capacity() {
        return this._capacity;
    }
    lruKey() {
        const sortedByValueAsc = new Map([
            ...this._ages
        ].sort((a, b)=>a[1] - b[1]));
        const firstEntry = sortedByValueAsc.keys().next();
        const key = firstEntry.value;
        return key;
    }
    set(key, value) {
        if (!this._values.has(key)) {
            if (this._ages.size == this._capacity) {
                this.delete(this.lruKey());
            }
        }
        this._values.set(key, value);
        this._ages.set(key, 1);
    }
    get(key) {
        const value = this._values.get(key);
        if (value) {
            let age = this._ages.get(key);
            if (age) {
                age++;
                if (age > this._maxAge) {
                    this._values.delete(key);
                    this._ages.delete(key);
                } else {
                    this._ages.set(key, age);
                }
            } else {
                this._ages.set(key, 1);
            }
        }
        return value;
    }
    clear() {
        this._ages.clear();
        this._values.clear();
    }
    delete(key) {
        this._ages.delete(key);
        return this._values.delete(key);
    }
    size() {
        return this._values.size;
    }
    has(key) {
        return this._values.has(key);
    }
    keys() {
        return this._values.keys();
    }
    values() {
        return this._values.values();
    }
    entries() {
        return this._values.entries();
    }
}
const mod8 = {
    LruCache
};
class IncomingMemoryStore {
    packets = new Set();
    store(packetId) {
        this.packets.add(packetId);
        return Promise.resolve();
    }
    has(packetId) {
        return Promise.resolve(this.packets.has(packetId));
    }
    discard(packetId) {
        this.packets.delete(packetId);
        return Promise.resolve();
    }
}
class MemoryStore {
    packets = new Map();
    store(packet) {
        if (!packet.packetId) {
            return Promise.reject(new Error('missing packet.packetId'));
        }
        this.packets.set(packet.packetId, packet);
        return Promise.resolve();
    }
    has(packetId) {
        const exist = this.packets.has(packetId);
        return Promise.resolve(exist);
    }
    discard(packetId) {
        this.packets.delete(packetId);
        return Promise.resolve();
    }
    count() {
        return Promise.resolve(this.packets.size);
    }
    clear() {
        this.packets.clear();
        return Promise.resolve();
    }
    async *iterate() {
        for (const value of this.packets.values()){
            yield value;
        }
    }
}
class Session {
    sessionId;
    packetIdProvider;
    inflightPublish;
    inflightSubscribe;
    inflightUnsubscribe;
    outgoingStore;
    constructor(sessionId, outgoingStore){
        this.sessionId = sessionId;
        this.packetIdProvider = new mod7.ReuseIdProvider(1, 65535);
        this.outgoingStore = outgoingStore || new MemoryStore();
        this.inflightPublish = new Map();
        this.inflightSubscribe = new Map();
        this.inflightUnsubscribe = new Map();
    }
    getSessionId() {
        return this.sessionId;
    }
    async aquirePacketId() {
        return await this.packetIdProvider.aquire();
    }
    async clearAllStores(newSessionId) {
        if (newSessionId) {
            this.sessionId = newSessionId;
        }
        await this.outgoingStore.clear();
        this.inflightPublish.clear();
        this.inflightSubscribe.clear();
        this.inflightUnsubscribe.clear();
    }
    async packetIdInUse(packetId) {
        return await this.packetIdProvider.inUse(packetId);
    }
    async discard(packet) {
        await this.packetIdProvider.release(packet.packetId);
        if (packet.type === 'puback' || packet.type === 'pubrec' || packet.type === 'pubcomp') {
            await this.outgoingStore.discard(packet.packetId);
        }
    }
    async storePublish(packet, deferred) {
        this.inflightPublish.set(packet.packetId, deferred);
        return await this.outgoingStore.store(packet);
    }
    async storePubrel(packet) {
        return await this.outgoingStore.store(packet);
    }
    getPublishDeferred(packetId) {
        const deferred = this.inflightPublish.get(packetId);
        this.inflightPublish.delete(packetId);
        return deferred;
    }
    storeSubscribe(packet, deferred) {
        this.inflightSubscribe.set(packet.packetId, deferred);
    }
    getSubscribeDeferred(packetId) {
        const deferred = this.inflightSubscribe.get(packetId);
        this.inflightSubscribe.delete(packetId);
        return deferred;
    }
    storeUnsubscribe(packet, deferred) {
        this.inflightUnsubscribe.set(packet.packetId, deferred);
    }
    getUnsubscribeDeferred(packetId) {
        const deferred = this.inflightUnsubscribe.get(packetId);
        this.inflightUnsubscribe.delete(packetId);
        return deferred;
    }
    async publishInflightCount() {
        return await this.outgoingStore.count();
    }
}
class TopicAliasManager {
    topicIdProvider;
    topicAliasMap;
    constructor(topicAliasMaximum){
        this.topicIdProvider = new ReuseIdProvider(1, topicAliasMaximum);
        this.topicAliasMap = new LruCache(topicAliasMaximum);
    }
    capacity() {
        return this.topicAliasMap.capacity();
    }
    isFull() {
        return this.topicAliasMap.size() == this.topicAliasMap.capacity();
    }
    getTopicId(topic) {
        if (this.topicAliasMap.has(topic)) {
            return this.topicAliasMap.get(topic);
        } else {
            return undefined;
        }
    }
    async registerTopic(topic) {
        if (this.topicAliasMap.has(topic)) {
            const tid = this.topicAliasMap.get(topic);
            if (tid) {
                this.topicIdProvider.release(tid);
            }
            const topicId = await this.aquireTopicId();
            this.topicAliasMap.set(topic, topicId);
            return topicId;
        } else {
            if (this.isFull()) {
                const lruTopic = this.topicAliasMap.lruKey();
                const tid = this.topicAliasMap.get(lruTopic);
                if (tid) {
                    this.topicIdProvider.release(tid);
                }
                this.topicAliasMap.delete(lruTopic);
            }
            const topicId = await this.aquireTopicId();
            this.topicAliasMap.set(topic, topicId);
            return topicId;
        }
    }
    releaseYounger() {}
    releaseTopic(topic) {
        if (this.topicAliasMap.has(topic)) {
            const topicId = this.topicAliasMap.get(topic);
            if (topicId) {
                this.topicIdProvider.release(topicId);
                this.topicAliasMap.delete(topic);
            }
        }
    }
    async aquireTopicId() {
        return await this.topicIdProvider.aquire();
    }
}
class ConnectionClosed extends Error {
    #className = 'ConnectionClosed';
    constructor(){
        super(`connection closed`);
    }
}
class ConnectionReset extends Error {
    #className = 'ConnectionReset';
    constructor(message){
        super(message);
    }
}
class ConnectTimeout extends Error {
    #className = 'ConnectTimeout';
    constructor(){
        super('connect timed out');
    }
}
class StateIsNotOfflineError extends Error {
    #className = 'StateIsNotOfflineError';
    constructor(message){
        super(`State is not offline: ${message}`);
    }
}
class StateIsNotOnlineError extends Error {
    #className = 'StateIsNotOnlineError';
    constructor(message){
        super(`State is not online: ${message}`);
    }
}
class SendPacketError extends Error {
    #className = 'SendPacketError';
    constructor(){
        super(`can't send packet because offline`);
    }
}
class UnexpectedUrlProtocol extends Error {
    #className = 'UnexpectedUrlProtocolextends';
    constructor(message){
        super(`unexpected URL protcol: ${message}`);
    }
}
const mod9 = {
    ConnectionClosed: ConnectionClosed,
    ConnectionReset: ConnectionReset,
    ConnectTimeout: ConnectTimeout,
    StateIsNotOfflineError: StateIsNotOfflineError,
    StateIsNotOnlineError: StateIsNotOnlineError,
    SendPacketError: SendPacketError,
    UnexpectedUrlProtocol: UnexpectedUrlProtocol
};
class Deferred {
    promise;
    resolve;
    reject;
    constructor(){
        this.promise = new Promise((resolve, reject)=>{
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}
const createCustomEvent = (type, eventInitDict)=>new CustomEvent(type, eventInitDict);
const defaultKeepAlive = 10;
const defaultConnectTimeout = 10 * 1000;
const defaultDisconnectTimeout = 1 * 1000;
const defaultPingrespTimeout = 2 * 1000;
class BaseMqttClient {
    url;
    userName;
    password;
    clientId;
    keepAlive;
    protocolVersion;
    clean;
    connectTimeout;
    disconnectTimeout;
    connectionState;
    disconnectRequested = false;
    session;
    unresolvedConnect;
    incomingStore;
    timers;
    log;
    caCerts;
    cert;
    privateKey;
    connectProperties;
    eventTarget;
    pingrespTimeoutMs;
    topicAliasManagerAboutSend;
    topicAliasMaximumAboutReceive;
    topicAliasMapAboutReceive;
    waitForClose;
    constructor(options){
        this.url = options?.url || new URL('mqtt://127.0.0.1:1883');
        this.log = options?.logger || (()=>{});
        this.userName = options?.username;
        this.password = options?.password;
        this.clientId = options?.clientId || '';
        this.keepAlive = (()=>{
            if (options?.keepAlive) {
                return options.keepAlive > 0 ? options.keepAlive : 0;
            } else {
                return defaultKeepAlive;
            }
        })();
        this.protocolVersion = options?.protocolVersion || mod.ProtocolVersion.MQTT_V5;
        this.clean = (()=>{
            if (options) {
                return typeof options.clean === 'undefined' ? true : options.clean;
            }
            return true;
        })();
        this.connectTimeout = options?.connectTimeoutMS || defaultConnectTimeout;
        this.disconnectTimeout = options?.disconnectTimeoutMS || defaultDisconnectTimeout;
        this.connectionState = 'offline';
        this.incomingStore = options?.incomingStore || new IncomingMemoryStore();
        if (this.clean) {
            this.session = new Session(this.clientId);
        } else {
            this.session = new Session(this.clientId, options?.outgoingStore);
        }
        this.caCerts = options?.caCerts;
        this.cert = options?.cert;
        this.privateKey = options?.privateKey;
        this.eventTarget = new EventTarget();
        this.pingrespTimeoutMs = options?.pingrespTimeoutMS || defaultPingrespTimeout;
        this.timers = {};
        if (this.protocolVersion == mod.ProtocolVersion.MQTT_V5 && options?.topicAliasMaximumAboutSend) {
            this.topicAliasManagerAboutSend = new TopicAliasManager(options.topicAliasMaximumAboutSend);
        }
        if (this.protocolVersion == mod.ProtocolVersion.MQTT_V5 && options?.topicAliasMaximumAboutReceive) {
            this.topicAliasMaximumAboutReceive = options.topicAliasMaximumAboutReceive;
        }
        this.topicAliasMapAboutReceive = new Map();
    }
    async sendPacket(packet) {
        try {
            if (this.connectionState === 'offline') {
                this.log(`can't send packet because offline.`, packet);
                throw new SendPacketError();
            }
            this.log(`sending ${packet.type} packet`, packet);
            const bytes = mod5.packetToBytes(packet, this.protocolVersion);
            this.startKeepAliveTimer();
            await this.write(bytes);
        } catch (err) {
            this.log(err, err.cause);
            throw err;
        }
    }
    async connect(options) {
        if (this.connectionState != 'offline') {
            return Promise.reject(new StateIsNotOfflineError('connect'));
        }
        if (options) {
            if (typeof options.clean !== 'undefined') {
                this.clean = options.clean;
            }
            if (options.properties) {
                this.connectProperties = options.properties;
            }
        }
        if (this.topicAliasMaximumAboutReceive) {
            if (this.connectProperties) {
                this.connectProperties.topicAliasMaximum = this.topicAliasMaximumAboutReceive;
            } else {
                this.connectProperties = {
                    topicAliasMaximum: this.topicAliasMaximumAboutReceive
                };
            }
        }
        this.connectionState = 'connecting';
        this.disconnectRequested = false;
        this.waitForClose = undefined;
        const deferred = new Deferred();
        this.unresolvedConnect = deferred;
        try {
            this.startConnectTimer();
            this.log(`opening connection to ${this.url}`);
            await this.open();
            const connectPacket = {
                type: 'connect',
                clientId: this.clientId,
                username: this.userName,
                password: this.password,
                protocolVersion: this.protocolVersion,
                clean: this.clean,
                keepAlive: this.keepAlive,
                properties: this.connectProperties,
                will: options?.will
            };
            this.log(`sending ${connectPacket.type} packet`, connectPacket);
            const bytes = mod5.packetToBytes(connectPacket, this.protocolVersion);
            await this.write(bytes);
        } catch (err) {
            this.log(`caught error opening connection: ${err.message}`);
            this.detectClosed();
            if (this.unresolvedConnect) {
                this.unresolvedConnect.reject(err);
            }
        }
        return deferred.promise;
    }
    async publishInflightCount() {
        return await this.session.publishInflightCount();
    }
    async publish(topic, payload, options, properties) {
        if (this.connectionState !== 'online') {
            throw new StateIsNotOnlineError('publish');
        }
        const dup = options && options.dup || false;
        const qos = options && options.qos || 0;
        const retain = options && options.retain || false;
        const deferred = new Deferred();
        const buffer = typeof payload === 'string' ? new TextEncoder().encode(payload) : payload;
        let topicId;
        if (this.topicAliasManagerAboutSend) {
            topicId = this.topicAliasManagerAboutSend.getTopicId(topic);
            if (topicId) {
                topic = '';
            } else {
                topicId = await this.topicAliasManagerAboutSend.registerTopic(topic);
            }
        }
        let publishProperties = properties;
        if (topicId) {
            if (publishProperties) {
                publishProperties.topicAlias = topicId;
            } else {
                publishProperties = {
                    topicAlias: topicId
                };
            }
        }
        if (qos === mod.QoS.AT_MOST_ONCE) {
            const packet = {
                type: 'publish',
                topic,
                payload: buffer,
                dup,
                retain,
                qos,
                packetId: 0,
                properties: publishProperties
            };
            await this.sendPacket(packet);
            deferred.resolve({
                result: 0,
                reason: ''
            });
        } else {
            const packetId = await this.session.aquirePacketId();
            const packet = {
                type: 'publish',
                topic,
                payload: buffer,
                dup,
                retain,
                qos,
                packetId,
                properties: publishProperties
            };
            await this.session.storePublish(packet, deferred);
            await this.sendPacket(packet);
        }
        return deferred.promise;
    }
    async subscribe(input, qos, properties) {
        const arr = Array.isArray(input) ? input : [
            input
        ];
        const subs = arr.map((sub)=>{
            return typeof sub === 'object' ? {
                topicFilter: sub.topicFilter,
                qos: sub.qos || qos || mod.QoS.AT_MOST_ONCE,
                retainHandling: sub.retainHandling,
                retainAsPublished: sub.retainAsPublished,
                noLocal: sub.noLocal
            } : {
                topicFilter: sub,
                qos: qos || mod.QoS.AT_MOST_ONCE
            };
        });
        const deferred = new Deferred();
        const packet = {
            type: 'subscribe',
            packetId: await this.session.aquirePacketId(),
            subscriptions: subs,
            properties: properties
        };
        await this.session.storeSubscribe(packet, deferred);
        await this.sendPacket(packet);
        return deferred.promise;
    }
    async unsubscribe(input, properties) {
        const unsubs = Array.isArray(input) ? input : [
            input
        ];
        const deferred = new Deferred();
        const packet = {
            type: 'unsubscribe',
            packetId: await this.session.aquirePacketId(),
            topicFilters: unsubs,
            properties
        };
        await this.session.storeUnsubscribe(packet, deferred);
        await this.sendPacket(packet);
        return deferred.promise;
    }
    async disconnect(force = false, properties) {
        const deferred = new Deferred();
        this.waitForClose = deferred;
        this.disconnectRequested = true;
        if (this.connectionState !== 'offline') {
            await this.doDisconnect(force, properties);
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    }
    async doDisconnect(force = false, properties) {
        if (this.connectionState === 'online') {
            if (force) {
                await this.close();
            } else {
                await this.sendPacket({
                    type: 'disconnect',
                    properties: properties
                });
                this.startDisconnectTimer();
            }
        }
    }
    async auth(reasonCode, properties) {
        const packet = {
            type: 'auth',
            reasonCode,
            properties
        };
        await this.sendPacket(packet);
    }
    write = (_byte)=>{};
    detectClosed() {
        this.log('connection closed.');
        this.connectionState = 'offline';
        this.stopConnectTimer();
        this.stopDisconnectTimer();
        this.stopKeepAliveTimer();
        this.stopPingrespTimer();
        this.eventTarget.dispatchEvent(createCustomEvent('closed', {}));
        if (this.waitForClose) {
            this.waitForClose.resolve();
        }
    }
    packetReceived(packet) {
        switch(packet.type){
            case 'connack':
                this.handleConnack(packet);
                break;
            case 'publish':
                this.handlePublish(packet);
                break;
            case 'puback':
                this.handlePuback(packet);
                break;
            case 'pubrec':
                this.handlePubrec(packet);
                break;
            case 'pubrel':
                this.handlePubrel(packet);
                break;
            case 'pubcomp':
                this.handlePubcomp(packet);
                break;
            case 'suback':
                this.handleSuback(packet);
                break;
            case 'unsuback':
                this.handleUnsuback(packet);
                break;
            case 'pingresp':
                this.handlePingresp(packet);
                break;
            case 'disconnect':
                this.handleDisconnect(packet);
                break;
            case 'auth':
                this.handleAuth(packet);
                break;
            default:
                throw new mod5.MqttPacketsError.UnsuportedPacketError('unknown');
        }
    }
    handleConnack(packet) {
        this.connectionState = 'online';
        this.stopConnectTimer();
        if (packet.properties?.assignedClientIdentifier) {
            this.clientId = packet.properties.assignedClientIdentifier;
        }
        if (!packet.sessionPresent) {
            this.session.clearAllStores(this.clientId);
        }
        if (packet.properties) {
            if (packet.properties.serverKeepAlive) {
                if (this.keepAlive > packet.properties.serverKeepAlive) {
                    this.keepAlive = packet.properties.serverKeepAlive;
                }
            }
            if (packet.properties.topicAliasMaximum) {
                if (this.topicAliasManagerAboutSend && this.topicAliasManagerAboutSend.capacity() > packet.properties.topicAliasMaximum) {
                    this.topicAliasManagerAboutSend = new TopicAliasManager(packet.properties.topicAliasMaximum);
                }
            }
        }
        if (this.unresolvedConnect) {
            this.unresolvedConnect.resolve(packet);
        }
        this.eventTarget.dispatchEvent(createCustomEvent('connack', {
            detail: packet
        }));
        if (this.disconnectRequested) {
            this.doDisconnect();
        } else {
            this.startKeepAliveTimer();
        }
    }
    async handlePublish(packet) {
        {
            if (packet.properties?.topicAlias) {
                if (packet.topic == '') {
                    const storedTopic = this.topicAliasMapAboutReceive.get(packet.properties.topicAlias);
                    if (storedTopic) {
                        packet.topic = storedTopic;
                    } else {
                        this.log('Unregistered topic alias receiv');
                        return;
                    }
                } else {
                    this.topicAliasMapAboutReceive.set(packet.properties.topicAlias, packet.topic);
                }
            }
        }
        if (packet.qos === mod.QoS.AT_MOST_ONCE) {
            this.eventTarget.dispatchEvent(createCustomEvent('publish', {
                detail: packet
            }));
        } else if (packet.qos === mod.QoS.AT_LEAST_ONCE) {
            this.sendPacket({
                type: 'puback',
                packetId: packet.packetId
            });
            this.eventTarget.dispatchEvent(createCustomEvent('publish', {
                detail: packet
            }));
        } else if (packet.qos === mod.QoS.EXACTRY_ONCE) {
            const emitMessage = !packet.dup || !await this.incomingStore.has(packet.packetId);
            if (emitMessage) {
                this.incomingStore.store(packet.packetId);
                this.sendPacket({
                    type: 'pubrec',
                    packetId: packet.packetId
                });
                this.eventTarget.dispatchEvent(createCustomEvent('publish', {
                    detail: packet
                }));
            }
        } else {
            throw new InvalidQoSError(packet.qos);
        }
    }
    async handlePuback(packet) {
        if (await this.session.packetIdInUse(packet.packetId)) {
            await this.session.discard(packet);
            const deferred = this.session.getPublishDeferred(packet.packetId);
            if (deferred) {
                if (packet.reasonCode) {
                    const reason = packet.properties?.reasonString;
                    deferred.resolve({
                        result: packet.reasonCode,
                        reason
                    });
                } else {
                    deferred.resolve({
                        result: mod.ReasonCode.Success
                    });
                }
            }
        } else {
            this.log(`Unknown packetId received, it ignore. (packetId:${packet.packetId})`, 'puback');
        }
    }
    async handlePubrec(packet) {
        if (await this.session.packetIdInUse(packet.packetId)) {
            if (packet.reasonCode && packet.reasonCode >= mod.ReasonCode.UnspecifiedError) {
                await this.session.discard(packet);
                const deferred = this.session.getPublishDeferred(packet.packetId);
                if (deferred) {
                    const reason = packet.properties?.reasonString;
                    deferred.resolve({
                        result: packet.reasonCode,
                        reason
                    });
                }
                return;
            }
            const pubrel = {
                type: 'pubrel',
                packetId: packet.packetId
            };
            this.session.storePubrel(pubrel);
            this.sendPacket(pubrel);
        } else {
            this.log(`Unknown packetId received. (packetId:${packet.packetId})`, 'pubrec');
            if (this.protocolVersion > mod.ProtocolVersion.MQTT_V3_1_1) {
                const pubrel = {
                    type: 'pubrel',
                    packetId: packet.packetId,
                    reasonCode: mod.ReasonCode.PacketIdentifierNotFound
                };
                this.sendPacket(pubrel);
            } else {
                const pubrel = {
                    type: 'pubrel',
                    packetId: packet.packetId
                };
                this.sendPacket(pubrel);
            }
        }
    }
    async handlePubrel(packet) {
        if (await this.incomingStore.has(packet.packetId)) {
            await this.incomingStore.discard(packet.packetId);
            this.sendPacket({
                type: 'pubcomp',
                packetId: packet.packetId
            });
        } else {
            this.log(`Unknown packetId received (packetId:${packet.packetId})`, 'pubrel');
            if (this.protocolVersion > mod.ProtocolVersion.MQTT_V3_1_1) {
                const pubcomp = {
                    type: 'pubcomp',
                    packetId: packet.packetId,
                    reasonCode: mod.ReasonCode.PacketIdentifierNotFound
                };
                this.sendPacket(pubcomp);
            } else {
                const pubcomp = {
                    type: 'pubcomp',
                    packetId: packet.packetId
                };
                this.sendPacket(pubcomp);
            }
        }
    }
    async handlePubcomp(packet) {
        if (await this.session.packetIdInUse(packet.packetId)) {
            await this.session.discard(packet);
            const deferred = this.session.getPublishDeferred(packet.packetId);
            if (deferred) {
                if (packet.reasonCode) {
                    const reason = packet.properties?.reasonString;
                    deferred.resolve({
                        result: packet.reasonCode,
                        reason
                    });
                } else {
                    deferred.resolve({
                        result: mod.ReasonCode.Success
                    });
                }
            }
        } else {
            this.log(`Unknown packetId received, it ignore. (packetId:${packet.packetId})`, 'pubcomp');
        }
    }
    async handleSuback(packet) {
        if (await this.session.packetIdInUse(packet.packetId)) {
            const rvList = packet.reasonCodes ? packet.reasonCodes : packet.returnCodes;
            await this.session.discard(packet);
            const deferred = this.session.getSubscribeDeferred(packet.packetId);
            if (deferred) {
                const reason = packet.properties?.reasonString;
                deferred.resolve({
                    reasons: rvList,
                    reason
                });
            }
        } else {
            this.log(`Unknown packetId received, it ignore. (packetId:${packet.packetId})`, 'suback');
        }
    }
    async handleUnsuback(packet) {
        if (await this.session.packetIdInUse(packet.packetId)) {
            await this.session.discard(packet);
            const deferred = this.session.getUnsubscribeDeferred(packet.packetId);
            if (deferred) {
                if (packet.reasonCodes) {
                    const reason = packet.properties?.reasonString;
                    deferred.resolve({
                        reasonCodes: packet.reasonCodes,
                        reason
                    });
                } else {
                    deferred.resolve({});
                }
            }
        } else {
            this.log(`Unknown packetId received, it ignore. (packetId:${packet.packetId})`, 'unsuback');
        }
    }
    handlePingresp(_packet) {
        this.stopPingrespTimer();
    }
    async handleDisconnect(packet) {
        await this.close();
        this.eventTarget.dispatchEvent(createCustomEvent('disconnect', {
            detail: packet
        }));
    }
    handleAuth(packet) {
        this.eventTarget.dispatchEvent(createCustomEvent('auth', {
            detail: packet
        }));
    }
    startDisconnectTimer() {
        this.startTimer('disconnect', ()=>{
            this.close();
        }, this.disconnectTimeout);
    }
    stopDisconnectTimer() {
        if (this.timerExists('disconnect')) {
            this.stopTimer('disconnect');
        }
    }
    startConnectTimer() {
        this.startTimer('connect', ()=>{
            this.close();
            if (this.unresolvedConnect) {
                this.unresolvedConnect.reject(new ConnectTimeout());
            }
        }, this.connectTimeout);
    }
    stopConnectTimer() {
        if (this.timerExists('connect')) {
            this.stopTimer('connect');
        }
    }
    startKeepAliveTimer() {
        if (!this.keepAlive) {
            return;
        }
        this.startTimer('keepAlive', async ()=>{
            await this.sendPacket({
                type: 'pingreq'
            });
            this.startPingrespTimer();
        }, this.keepAlive * 1000);
    }
    stopKeepAliveTimer() {
        if (this.timerExists('keepAlive')) {
            this.stopTimer('keepAlive');
        }
    }
    startPingrespTimer() {
        this.startTimer('pingrespTimeout', async ()=>{
            await this.disconnect(true);
        }, this.pingrespTimeoutMs);
    }
    stopPingrespTimer() {
        if (this.timerExists('pingrespTimeout')) {
            this.stopTimer('pingrespTimeout');
        }
    }
    startTimer(name, cb, delay) {
        if (this.timerExists(name)) {
            this.stopTimer(name);
        }
        this.timers[name] = setTimeout(()=>{
            delete this.timers[name];
            cb();
        }, delay);
    }
    stopTimer(name) {
        if (!this.timerExists(name)) {
            return;
        }
        const timerId = this.timers[name];
        if (timerId) {
            clearTimeout(timerId);
            delete this.timers[name];
        }
    }
    timerExists(name) {
        return !!this.timers[name];
    }
    on = (type, callback)=>{
        this.eventTarget.addEventListener(type, callback);
    };
    off = (type, callback)=>{
        this.eventTarget.removeEventListener(type, callback);
    };
    getClientId() {
        return this.clientId;
    }
}
class WebSocketMqttClient extends BaseMqttClient {
    conn;
    readBuffers;
    constructor(options){
        if (!options?.url) {
            throw new Error('uri required');
        }
        super(options);
        this.readBuffers = [];
    }
    adjustReadBytes(data) {
        const results = [];
        data.forEach((__byte)=>{
            this.readBuffers.push(__byte);
        });
        do {
            if (this.readBuffers.length < 2) {
                break;
            }
            const remainingLengthBytes = [];
            let offset = 1;
            const rb = new Uint8Array([
                ...this.readBuffers
            ]);
            do {
                const __byte = rb[offset];
                remainingLengthBytes.push(__byte);
                if (__byte >> 7 == 0) {
                    break;
                } else if (offset == 5) {
                    throw new Error('malformed packet');
                }
                offset++;
            }while (offset < 5)
            const remainingLength = mod2.variableByteIntegerToNum(new Uint8Array([
                ...remainingLengthBytes
            ]), 0);
            const fixedHeaderSize = 1 + remainingLength.size;
            if (fixedHeaderSize + remainingLength.number > this.readBuffers.length) {
                break;
            }
            const receiveByte = new Uint8Array([
                ...this.readBuffers.slice(0, remainingLength.number + fixedHeaderSize)
            ]);
            results.push(receiveByte);
            this.readBuffers = this.readBuffers.slice(remainingLength.number + fixedHeaderSize);
        }while (this.readBuffers.length > 0)
        if (results.length === 0) {
            return undefined;
        } else {
            return results;
        }
    }
    open() {
        const deferred = new Deferred();
        this.conn = new WebSocket(this.url, 'mqtt');
        this.conn.binaryType = 'arraybuffer';
        this.write = async (bytes)=>{
            if (this.conn) {
                this.log('writing bytes', bytes);
                await this.conn.send(bytes);
            }
        };
        this.conn.onclose = (_e)=>{
            this.detectClosed();
        };
        this.conn.onmessage = (e)=>{
            const temporaryReceiveBytes = new Uint8Array(e.data);
            const array = this.adjustReadBytes(temporaryReceiveBytes);
            if (typeof array === 'undefined') {
                return;
            }
            array.forEach((receiveBytes)=>{
                this.log('receive bytes', receiveBytes);
                const packet = mod5.decode(receiveBytes, this.protocolVersion);
                this.log('receive packet', packet);
                this.packetReceived(packet);
            });
        };
        this.conn.onerror = (e)=>{
            if (e instanceof ErrorEvent) {
                this.log('error occured.', e.message);
            }
            if (this.conn) {
                this.conn.close();
            }
        };
        this.conn.onopen = (_e)=>{
            deferred.resolve();
        };
        return deferred.promise;
    }
    async close() {
        if (this.conn) {
            await this.conn.close();
        }
        return Promise.resolve();
    }
}
export { WebSocketMqttClient as WebSocketMqttClient };
export { mod as Mqtt };
export { mod5 as MqttPackets };
export { mod3 as MqttProperties };
export { mod6 as ClientTypes };
export { mod9 as ClientErrors };
export { mod8 as Cache };

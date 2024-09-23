import { Cache, Mqtt, MqttPackets, MqttProperties } from '@ymjacky/mqtt5';
import { extname } from '@std/path';

// 接続クライアント
class Client {
  public clientId: string;
  public protocolVersion: Mqtt.ProtocolVersion;
  public conn: WebSocket;
  private subscription: Map<string, number>;

  constructor(
    clientId: string,
    protocolVersion: Mqtt.ProtocolVersion,
    conn: WebSocket,
  ) {
    this.clientId = clientId;
    this.protocolVersion = protocolVersion;
    this.conn = conn;
    this.subscription = new Map<string, number>();
  }

  async destrory() {
    this.conn.close();
    return await new Promise((resolve) => setTimeout(resolve, 100));
  }

  public subscribe(topicFilter: string, qos: number) {
    this.subscription.set(topicFilter, qos);
  }

  public hasSubscription(topicFilter: string) {
    return this.subscription.has(topicFilter);
  }
}

// カステムイベント
interface CustomEventMap {
  'accept': CustomEvent<WebSocket>;
  'closed': CustomEvent<void>;
  // 'connect': CustomEvent<MqttPackets.ConnectPacket>;
  'connack': CustomEvent<MqttPackets.ConnackPacket>;
  'publish': CustomEvent<MqttPackets.PublishPacket>;
  'puback': CustomEvent<MqttPackets.PubackPacket>;
  'pubrec': CustomEvent<MqttPackets.PubrecPacket>;
  'pubrel': CustomEvent<MqttPackets.PubrelPacket>;
  'pubcomp': CustomEvent<MqttPackets.PubcompPacket>;
  'subscribe': CustomEvent<MqttPackets.SubscribePacket>;
  'suback': CustomEvent<MqttPackets.SubackPacket>;
  'unsubscribe': CustomEvent<MqttPackets.UnsubscribePacket>;
  'unsuback': CustomEvent<MqttPackets.UnsubackPacket>;
  'pingreq': CustomEvent<MqttPackets.PingreqPacket>;
  'pingresp': CustomEvent<MqttPackets.PingrespPacket>;
  'disconnect': CustomEvent<MqttPackets.DisconnectPacket>;
  'auth': CustomEvent<MqttPackets.AuthPacket>;
}

interface CustomEventListener<T = unknown> {
  (evt: T): void | Promise<void>;
}
const createCustomEvent = <T extends keyof CustomEventMap>(
  type: T,
  eventInitDict: CustomEventInit<
    CustomEventMap[T] extends CustomEvent<infer T> ? T : never
  >,
) => new CustomEvent(type, eventInitDict);

// ログ
const log = (msg: string, ...args: unknown[]): void => {
  console.log(`${msg}`, ...args);
};
const info = (msg: string, ...args: unknown[]): void => {
  log(`[info ] ${msg}`, ...args);
};
const debug = (msg: string, ...args: unknown[]): void => {
  // log(`[debug] ${msg}`, ...args);
};
const error = (msg: string, ...args: unknown[]): void => {
  log(`[error] ${msg}`, ...args);
};

export class WsBroker extends EventTarget {
  handler: Deno.ServeHandler;

  clients: Map<WebSocket, Client>;
  accessList: Cache.LruCache<string, Date>;

  private buffersMap: Map<WebSocket, Array<number>>;

  on = <T extends keyof CustomEventMap>(
    type: T,
    callback: CustomEventListener<CustomEventMap[T]>,
  ) => {
    this.addEventListener(type, callback as EventListener);
  };

  constructor() {
    super();
    this.clients = new Map<WebSocket, Client>();
    this.accessList = new Cache.LruCache<string, Date>(100, 10); // ip, age

    this.buffersMap = new Map<WebSocket, Array<number>>();

    // websocket接続イベント
    this.on('accept', (event) => {
      const conn: WebSocket = event.detail;
      this.setupMqttEvent(conn);
    });

    /**
     * HTTPハンドラー
     * GETメソッドでwebsocketのupgradeのリクエストが来た時、MQTTの接続シーケンスへ移る
     */
    this.handler = (request: Request, handlerInfo: Deno.ServeHandlerInfo): Response => {
      const { method } = request;
      const remoteHost = handlerInfo.remoteAddr.hostname;
      const userAgent = request.headers.get('user-agent');

      info(`connecting from ${remoteHost}:${handlerInfo.remoteAddr.port} , user-agent: ${userAgent}`);

      const url = new URL(request.url);
      debug('path', url.pathname);
      const ext = extname(url.pathname);

      // DOS対策
      {
        const dosKey = `${remoteHost}:${ext}`; // IP Address : extname
        const lastAccess = this.accessList.get(dosKey);
        if (lastAccess) {
          // debug(`last access. remoteHost: ${remoteHost}, ${lastAccess}`);
          let later: Date = new Date(lastAccess);
          later.setSeconds(lastAccess.getSeconds() + 30); // 30秒後

          // debug(`later: ${later}, now ${new Date()}`);
          if (later > new Date()) {
            // 30秒以内のアクセスは拒絶
            error(`Deny continuous access. address: ${remoteHost}`);
            return new Response(null, { status: 429 }); // 429: Too Many Requests
          }
        }
        // debug(`append accessList. remoteHost: ${remoteHost}`);
        this.accessList.set(dosKey, new Date());
      }

      if (method === 'GET') {
        if (request.headers.get('upgrade') === 'websocket') {
          info(`receive upgradeWebSocket. host: ${remoteHost}`);
          const { socket, response } = Deno.upgradeWebSocket(request, { protocol: 'mqtt' });
          socket.binaryType = 'arraybuffer';

          this.dispatchEvent(
            createCustomEvent('accept', { detail: socket }),
          );

          return response;
        }

        const fileurl = new URL(`file://.${url.pathname}`);
        if ((fileurl.pathname === '/index.html') || (fileurl.pathname === '/mqtt5.mjs')) {
          info(`get ${fileurl.pathname}. host: ${remoteHost}`);
          const file = Deno.readFileSync(`.${url.pathname}`);
          let contentType = 'text/html';
          if ('.mjs' === ext) {
            contentType = 'text/javascript';
          }
          debug(`contentType: ${contentType}, ext: ${ext}`);
          return new Response(file, {
            headers: {
              'content-type': contentType,
            },
          });
        }
      } else {
        // method != GET
        // return new Response('Not Found', { status: 404 }); // 404: Not Found
        return new Response(null, { status: 404 }); // 404: Not Found
      }

      return new Response(`hello. ${new Date()}`);
    };
  }

  listen(port: number) {
    info(`broker started. port: ${port}`);
    Deno.serve({ port: port, handler: this.handler });
  }

  private adjustReadBytes(conn: WebSocket, data: Uint8Array): Array<Uint8Array> {
    const packets: Array<Uint8Array> = [];
    let readBuffer = this.buffersMap.get(conn) || [];

    data.forEach((byte) => {
      readBuffer.push(byte);
    });
    this.buffersMap.set(conn, readBuffer);

    // lambda
    const readRemaingLength = (byte: number, multiplier: number): [boolean, number] => {
      let hasNext = false;
      const len = (byte & 0b01111111) * multiplier;
      if ((byte & 0b10000000) != 0) {
        hasNext = true;
      }
      return [hasNext, len];
    };

    let cursol = 0;
    let multiplier = 1;
    let remainingLength = 0;
    let remainingLemgthFieldSize = 1;

    while (readBuffer.length > cursol) {
      cursol++;
      const tpl = readRemaingLength(readBuffer[cursol], multiplier);
      const hasNext = tpl[0];
      remainingLength += tpl[1];
      if (hasNext) {
        multiplier *= 128;
        remainingLemgthFieldSize++;
        continue;
      }

      const fixedHeaderLength = 1 + remainingLemgthFieldSize; // 1: packetType field
      const packetLength = fixedHeaderLength + remainingLength;
      if (readBuffer.length < packetLength) {
        break;
      }

      // Packet length is sufficient
      const receiveByte = new Uint8Array([...readBuffer.slice(0, packetLength)]);
      readBuffer = readBuffer.slice(packetLength);
      this.buffersMap.set(conn, readBuffer);
      cursol = 0;

      packets.push(receiveByte);
    }

    return packets;
  }

  private setupMqttEvent(conn: WebSocket) {
    conn.onclose = (_e: CloseEvent) => {
      info('websocket connection closed');
      this.buffersMap.delete(conn);
      if (this.clients.has(conn)) {
        this.clients.delete(conn);
      }

      this.dispatchEvent(
        createCustomEvent('closed', {}),
      );
    };

    conn.onerror = (e: Event) => {
      if (e instanceof ErrorEvent) {
        info('error occured.', e.message);
      }
      conn.close();
    };

    conn.onmessage = (e: MessageEvent<unknown>) => {
      const temporaryReceiveBytes = new Uint8Array(e.data as ArrayBuffer);
      const packets = this.adjustReadBytes(conn, temporaryReceiveBytes);
      packets.forEach((receiveBytes) => {
        debug('receive bytes', receiveBytes);
        const packet = MqttPackets.decode(receiveBytes);
        debug('receive packet', packet);

        switch (packet.type) {
          case 'connect':
            this.handleMqttConnect(conn, packet);
            break;
          case 'publish':
            this.handleMqttPublish(conn, packet);
            this.dispatchEvent(
              createCustomEvent('publish', {
                detail: packet as MqttPackets.PublishPacket,
              }),
            );
            break;
          case 'puback':
            this.handleMqttPuback(conn, packet);
            this.dispatchEvent(
              createCustomEvent('puback', {
                detail: packet as MqttPackets.PubackPacket,
              }),
            );
            break;
          case 'pubrec':
            this.handleMqttPubrec(conn, packet);
            this.dispatchEvent(
              createCustomEvent('pubrec', {
                detail: packet as MqttPackets.PubrecPacket,
              }),
            );
            break;
          case 'pubrel':
            this.handleMqttPubrel(conn, packet);
            this.dispatchEvent(
              createCustomEvent('pubrel', {
                detail: packet as MqttPackets.PubrelPacket,
              }),
            );
            break;
          case 'pubcomp':
            this.handleMqttPubcomp(conn, packet);
            this.dispatchEvent(
              createCustomEvent('pubcomp', {
                detail: packet as MqttPackets.PubcompPacket,
              }),
            );
            break;
          case 'subscribe':
            this.handleMqttSubscribe(conn, packet);
            this.dispatchEvent(
              createCustomEvent('subscribe', {
                detail: packet as MqttPackets.SubscribePacket,
              }),
            );
            break;

          case 'unsubscribe':
            this.dispatchEvent(
              createCustomEvent('unsubscribe', {
                detail: packet as MqttPackets.UnsubscribePacket,
              }),
            );
            break;

          case 'pingreq':
            this.handleMqttPingreq(conn);
            this.dispatchEvent(
              createCustomEvent('pingreq', {
                detail: packet as MqttPackets.PingreqPacket,
              }),
            );
            break;

          case 'disconnect':
            this.dispatchEvent(
              createCustomEvent('disconnect', {
                detail: packet as MqttPackets.DisconnectPacket,
              }),
            );
            break;

          case 'auth':
            debug('receive auth packet');
            this.dispatchEvent(
              createCustomEvent('auth', {
                detail: packet as MqttPackets.AuthPacket,
              }),
            );
            break;
          default:
            error('An unexpected packet was received.', `packet: ${packet}`);
            break;
        }
      });
    };
  }

  async handleMqttConnect(socket: WebSocket, connect: MqttPackets.ConnectPacket): Promise<void> {
    debug('handleMqttConnect', `clientId: ${connect.clientId}`);

    let connack: MqttPackets.ConnackPacket;

    // validation
    {
      if (connect.clientId === '') {
        if (connect.protocolVersion > Mqtt.ProtocolVersion.MQTT_V3_1_1) {
          connack = {
            type: 'connack',
            sessionPresent: false,
            reasonCode: Mqtt.ReasonCode.ClientIdentifierNotValid,
          };
        } else {
          connack = {
            type: 'connack',
            sessionPresent: false,
            returnCode: Mqtt.V3_1_1_ConnectReturnCode.IdentifierRejected,
          };
        }
        const bytes = MqttPackets.packetToBytes(connack, connect.protocolVersion);
        await socket.send(bytes);
        return;
      }
    }

    this.clients.set(
      socket,
      new Client(connect.clientId, connect.protocolVersion, socket),
    );

    // send connack
    {
      if (connect.protocolVersion > Mqtt.ProtocolVersion.MQTT_V3_1_1) {
        const connackProperties: MqttProperties.ConnackProperties = {
          sessionExpiryInterval: 0,
          // receiveMaximum: 10,
          maximumQoS: 2,
          retainAvailable: false,
          // maximumPacketSize: 128,
          // assignedClientIdentifier: 'cid2',
          // topicAliasMaximum: 11,
          // reasonString: 'NotAuthorized',
          // userProperties: [
          //   { key: 'userProp1', val: 'userData1' },
          //   { key: 'userProp2', val: 'userData2' },
          //   { key: 'userProp2', val: 'userData3' },
          // ],
          wildcardSubscriptionAvailable: false,
          subscriptionIdentifiersAvailable: false,
          sharedSubscriptionAvailable: false,
          serverKeepAlive: 30,
          // responseInformation: 'response_topic',
          // serverReference: 'mqtt://127.0.0.1:11883',
          // authenticationMethod: 'digest',
          // authenticationData: new TextEncoder().encode('ABCDEFG'),
        };
        connack = {
          type: 'connack',
          sessionPresent: false,
          reasonCode: Mqtt.ReasonCode.Success,
          properties: connackProperties,
        };
      } else {
        connack = {
          type: 'connack',
          sessionPresent: false,
          returnCode: Mqtt.V3_1_1_ConnectReturnCode.ConnectionAccepted,
        };
      }

      debug('send packet', connack);
      const bytes = MqttPackets.packetToBytes(connack, connect.protocolVersion);
      debug('send bytes', bytes);
      await socket.send(bytes);
    }
  }

  async handleMqttPublish(socket: WebSocket, publish: MqttPackets.PublishPacket): Promise<void> {
    const client = this.clients.get(socket);
    if (client) {
      debug('handleMqttPublish', `clientId: ${client.clientId}`);

      switch (publish.qos) {
        case Mqtt.QoS.AT_MOST_ONCE:
          break;
        case Mqtt.QoS.AT_LEAST_ONCE:
          {
            const puback: MqttPackets.PubackPacket = {
              type: 'puback',
              packetId: publish.packetId!,
              reasonCode: Mqtt.ReasonCode.Success,
            };
            debug('send packet', puback);
            const bytes = MqttPackets.packetToBytes(puback, client.protocolVersion);
            debug('send bytes', bytes);
            await socket.send(bytes);
          }
          break;

        case Mqtt.QoS.EXACTRY_ONCE:
          {
            const pubrec: MqttPackets.PubrecPacket = {
              type: 'pubrec',
              packetId: publish.packetId!,
              reasonCode: Mqtt.ReasonCode.Success,
            };
            debug('send packet', pubrec);
            const bytes = MqttPackets.packetToBytes(pubrec, client.protocolVersion);
            debug('send bytes', bytes);
            await socket.send(bytes);
          }
          break;
        default:
          return;
      }

      const topic = publish.topic;
      this.clients.forEach((client) => {
        if (client.hasSubscription(topic)) {
          const packet: MqttPackets.PublishPacket = {
            type: 'publish',
            topic,
            payload: publish.payload,
            dup: false,
            retain: false,
            qos: Mqtt.QoS.AT_MOST_ONCE,
            packetId: 0,
            properties: publish.properties,
          };

          debug('send packet', packet);
          const bytes = MqttPackets.packetToBytes(packet, client.protocolVersion);
          debug('send bytes', bytes);
          client.conn.send(bytes);
        }
      });
    } else {
      error('handleMqttPublish', `unknown client`);
    }
  }

  async handleMqttPuback(socket: WebSocket, puback: MqttPackets.PubackPacket): Promise<void> {
    const client = this.clients.get(socket);
    if (client) {
      debug('handleMqttPuback', `clientId: ${client.clientId}`);
    } else {
      error('handleMqttPuback', `unknown client`);
    }
  }

  async handleMqttPubrec(socket: WebSocket, pubrec: MqttPackets.PubrecPacket): Promise<void> {
    const client = this.clients.get(socket);
    if (client) {
      debug('handleMqttPubrec', `clientId: ${client.clientId}`);

      const packet: MqttPackets.PubrelPacket = {
        type: 'pubrel',
        packetId: pubrec.packetId,
        reasonCode: Mqtt.ReasonCode.Success,
      };
      debug('send packet', packet);
      const bytes = MqttPackets.packetToBytes(packet, client.protocolVersion);
      debug('send bytes', bytes);
      await socket.send(bytes);
    } else {
      error('handleMqttPubrec', `unknown client`);
    }
  }

  async handleMqttPubrel(socket: WebSocket, pubrel: MqttPackets.PubrelPacket): Promise<void> {
    const client = this.clients.get(socket);
    if (client) {
      debug('handleMqttPubrel', `clientId: ${client.clientId}`);
      const packet: MqttPackets.PubcompPacket = {
        type: 'pubcomp',
        packetId: pubrel.packetId,
        reasonCode: Mqtt.ReasonCode.Success,
      };
      debug('send packet', packet);
      const bytes = MqttPackets.packetToBytes(packet, client.protocolVersion);
      debug('send bytes', bytes);
      await socket.send(bytes);
    } else {
      error('handleMqttPubrel', `unknown client`);
    }
  }

  async handleMqttPubcomp(socket: WebSocket, pubcomp: MqttPackets.PubcompPacket): Promise<void> {
    const client = this.clients.get(socket);
    if (client) {
      debug('handleMqttPubcomp', `clientId: ${client.clientId}`);
    } else {
      error('handleMqttPubcomp', `unknown client`);
    }
  }

  async handleMqttSubscribe(socket: WebSocket, subscribe: MqttPackets.SubscribePacket): Promise<void> {
    const client = this.clients.get(socket);
    if (client) {
      debug('handleMqttSubscribe', `clientId: ${client.clientId}`);

      client.subscribe(subscribe.subscriptions[0].topicFilter, subscribe.subscriptions[0].qos);

      const suback: MqttPackets.SubackPacket = {
        type: 'suback',
        packetId: subscribe.packetId,
        reasonCodes: [Mqtt.ReasonCode.GrantedQoS0],
      };
      debug('send packet', suback);
      const bytes = MqttPackets.packetToBytes(suback, client.protocolVersion);
      debug('send bytes', bytes);
      await socket.send(bytes);
    } else {
      error('handleMqttSubscribe', `unknown client`);
    }
  }

  async handleMqttPingreq(socket: WebSocket): Promise<void> {
    const client = this.clients.get(socket);
    if (client) {
      info('handleMqttPingreq', `clientId: ${client.clientId}`);
      const pingresp: MqttPackets.PingrespPacket = {
        type: 'pingresp',
      };
      debug('send packet', pingresp);
      const bytes = MqttPackets.packetToBytes(pingresp, client.protocolVersion);
      debug('send bytes', bytes);
      await socket.send(bytes);
    } else {
      error('handleMqttPingreq', `unknown client`);
    }
  }
}

const broker = new WsBroker();
broker.listen(3000);

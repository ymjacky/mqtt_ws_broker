import { Mqtt, MqttPackets, MqttProperties } from '@ymjacky/mqtt5';

// 接続クライアント
class Client {
  public clientId: string;
  public protocolVersion: Mqtt.ProtocolVersion;
  public conn: WebSocket;

  constructor(
    clientId: string,
    protocolVersion: Mqtt.ProtocolVersion,
    conn: WebSocket,
  ) {
    this.clientId = clientId;
    this.protocolVersion = protocolVersion;
    this.conn = conn;
  }

  async destrory() {
    this.conn.close();
    return await new Promise((resolve) => setTimeout(resolve, 100));
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
const debug = (msg: string, ...args: unknown[]): void => {
  log(`[debug] ${msg}`, ...args);
};
const error = (msg: string, ...args: unknown[]): void => {
  log(`[error] ${msg}`, ...args);
};

export class WsBroker extends EventTarget {
  handler: Deno.ServeHandler;

  clients: Map<string, Client>;

  on = <T extends keyof CustomEventMap>(
    type: T,
    callback: CustomEventListener<CustomEventMap[T]>,
  ) => {
    this.addEventListener(type, callback as EventListener);
  };

  private setupMqttEvent(conn: WebSocket) {
    conn.onclose = (_e: CloseEvent) => {
      log('websocket connection closed');
      this.dispatchEvent(
        createCustomEvent('closed', {}),
      );
    };

    conn.onerror = (e: Event) => {
      if (e instanceof ErrorEvent) {
        log('error occured.', e.message);
      }
      conn.close();
    };

    conn.onmessage = (e: MessageEvent<unknown>) => {
      const receiveBytes = new Uint8Array(e.data as ArrayBuffer);
      debug('receive bytes', receiveBytes);
      const packet = MqttPackets.decode(receiveBytes);
      debug('receive packet', packet);

      switch (packet.type) {
        case 'connect':
          this.handleMqttConnect(conn, packet);

          // this.clients.set(
          //   packet.clientId,
          //   new Client(packet.clientId, packet.protocolVersion, conn),
          // );

          // this.dispatchEvent(
          //   createCustomEvent('connect', {
          //     detail: packet as MqttPackets.ConnectPacket,
          //   }),
          // );
          break;
        case 'publish':
          this.dispatchEvent(
            createCustomEvent('publish', {
              detail: packet as MqttPackets.PublishPacket,
            }),
          );
          break;
        case 'puback':
          this.dispatchEvent(
            createCustomEvent('puback', {
              detail: packet as MqttPackets.PubackPacket,
            }),
          );
          break;
        case 'pubrec':
          this.dispatchEvent(
            createCustomEvent('pubrec', {
              detail: packet as MqttPackets.PubrecPacket,
            }),
          );
          break;
        case 'pubrel':
          this.dispatchEvent(
            createCustomEvent('pubrel', {
              detail: packet as MqttPackets.PubrelPacket,
            }),
          );
          break;
        case 'pubcomp':
          this.dispatchEvent(
            createCustomEvent('pubcomp', {
              detail: packet as MqttPackets.PubcompPacket,
            }),
          );
          break;
        case 'subscribe':
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
          log('receive auth packet');
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
    };
  }

  async handleMqttConnect(socket: WebSocket, connect: MqttPackets.ConnectPacket): Promise<void> {
    log('receive connect packet');

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
      connect.clientId,
      new Client(connect.clientId, connect.protocolVersion, socket),
    );

    // send connack
    {
      if (connect.protocolVersion > Mqtt.ProtocolVersion.MQTT_V3_1_1) {
        const connackProperties: MqttProperties.ConnackProperties = {
          sessionExpiryInterval: 0,
          receiveMaximum: 10,
          maximumQoS: 2,
          retainAvailable: true,
          maximumPacketSize: 128,
          assignedClientIdentifier: 'cid2',
          topicAliasMaximum: 11,
          reasonString: 'NotAuthorized',
          userProperties: [
            { key: 'userProp1', val: 'userData1' },
            { key: 'userProp2', val: 'userData2' },
            { key: 'userProp2', val: 'userData3' },
          ],
          wildcardSubscriptionAvailable: true,
          subscriptionIdentifiersAvailable: true,
          sharedSubscriptionAvailable: true,
          serverKeepAlive: 40,
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
      const bytes = MqttPackets.packetToBytes(connack, connect.protocolVersion);
      await socket.send(bytes);
    }
  }

  constructor() {
    super();
    this.clients = new Map<string, Client>();

    // websocket接続イベント
    this.on('accept', (event) => {
      const conn: WebSocket = event.detail;

      this.setupMqttEvent(conn);
    });

    /**
     * HTTPハンドラー
     * GETメソッドでwebsocketのupgradeのリクエストが来た時、MQTTの接続シーケンスへ移る
     */
    this.handler = (request: Request, info: Deno.ServeHandlerInfo): Response => {
      const { method } = request;

      log(`connecting from ${info.remoteAddr.hostname}:${info.remoteAddr.port} , user-agent: ${request.headers.get('user-agent')}`);

      if (method === 'GET') {
        if (request.headers.get('upgrade') === 'websocket') {
          log(`receive upgradeWebSocket`);
          const { socket, response } = Deno.upgradeWebSocket(request);
          socket.binaryType = 'arraybuffer';

          this.dispatchEvent(
            createCustomEvent('accept', { detail: socket }),
          );

          return response;
        }
      } else {
        // method != GET
        return new Response('Not Found', { status: 404 });
      }

      return new Response(`hello. ${new Date()}`);
    };
  }

  listen(port: number) {
    log(`broker started. port: ${port}`);
    Deno.serve({ port: port, handler: this.handler });
  }
}

const broker = new WsBroker();
broker.listen(8080);

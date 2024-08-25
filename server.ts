export interface CustomEventMap {
  'accept': CustomEvent<WebSocket>;
  'closed': CustomEvent<void>;
}

export interface CustomEventListener<T = unknown> {
  (evt: T): void | Promise<void>;
}
export const createCustomEvent = <T extends keyof CustomEventMap>(
  type: T,
  eventInitDict: CustomEventInit<
    CustomEventMap[T] extends CustomEvent<infer T> ? T : never
  >,
) => new CustomEvent(type, eventInitDict);

const log = (msg: string, ...args: unknown[]): void => {
  console.log(`[WsBroker] ${msg}`, ...args);
};
export class WsBroker extends EventTarget {
  handler: Deno.ServeHandler;

  constructor() {
    super();

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
      }
      return new Response('hey hello hello');
      // return new Response('Not Found', { status: 404 });
    };
  }

  listen(port: number) {
    log(`broker started. port: ${port}`);
    Deno.serve({ port: port, handler: this.handler });
  }
}

const broker = new WsBroker();
broker.listen(8080);

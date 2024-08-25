const port = 8080;

export class WsBroker {
  handler: Deno.ServeHandler;

  constructor() {
    this.handler = (request: Request): Response => {
      return new Response('hey hello hello');
    };
  }

  listen(port: number) {
    Deno.serve({ port: port, handler: this.handler });
  }
}

const broker = new WsBroker();
broker.listen(port);

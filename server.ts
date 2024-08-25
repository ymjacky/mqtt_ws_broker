const port = 8080;
const handler = (request: Request): Response => {
  return new Response('hey hello');
};

Deno.serve(handler);

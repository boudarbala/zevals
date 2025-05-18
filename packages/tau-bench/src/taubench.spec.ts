import taubench from '.';

test('taubench retail', async () => {
  // Get policy
  const policy = await taubench.retail.policy();
  expect(policy).toBeTruthy();

  // Start the server
  const port = 55557;
  const { server, getDB } = await taubench.retail.serve({ port });
  expect(server).toBeDefined();

  // Fetch the server's OpenAPI spec
  const spec: any = await fetch(`http://localhost:${port}/docs/json`).then((res) => res.json());
  expect(spec.paths).toBeDefined();

  // Initialize a database
  const db = await getDB('xx');

  expect(db.orders).toBeTruthy();
  expect(db.users).toBeTruthy();
  expect(db.products).toBeTruthy();

  // Close the server
  await server.close();
});

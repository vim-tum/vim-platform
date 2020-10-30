// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
  logLevel: 1,
  backendURL: "http://localhost:5000/api",  // platform settings: "http://[VM_IP_ADDRESS]:5000/api"
  configBackendURL: "http://localhost:5000/api/config"  // platform settings: "http://[VM_IP_ADDRESS]:5000/api/config"
};

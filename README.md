# ts-di-starter

![install size](https://badgen.net/packagephobia/install/simple-cached-firestore)
![Codecov](https://img.shields.io/codecov/c/gh/ehacke/simple-cached-firestore)
![CircleCI](https://img.shields.io/circleci/build/github/ehacke/simple-cached-firestore)
![GitHub](https://img.shields.io/github/license/ehacke/simple-cached-firestore)

Node Typescript API template with Dependency Injection

> You don't need a framework, just a pattern

## Sponsor 

![asserted.io](https://raw.githubusercontent.com/ehacke/simple-cached-firestore/master/images/logo.png)

[Test in Prod](https://asserted.io)

## Features

- Dependency Injected Everything so everything is modular and unit testable
- Everything testable with emulators and Docker, many examples
- Typescript everything
- Express API with dependency injected routes, controllers and middleware
- Firestore with transparent validation and caching
- Websockets driven by distributed events service
- Fail-safe and centralized configuration loading and validation, no `process.env` all over the code
- Flexible and configurable rate limiting
- Flexibility over magic

## Steps

1. Clone repo
1. Rename `example.env` and `example.env.local` to `.env` and `.env.local`
1. Add your PROJECT_ID and SERVICE_ACCOUNT_PATH to `.env.local` if you want to run the server locally
1. Never check in your `.env*` files!
1. Make sure you have Docker and Docker Compose installed
1. `npm run test` for tests with Firestore emulator and docker redis
1. `npm run local` to start API locally with local redis, but connect to remote Firestore
    a. (you can modify .env.local to use the emulator instead of remote Firestore if you'd like)
1. You now have a starting point
1. Modify to whatever you like
1. ?
1. Profit

## Folder Structure

```
├── .circleci/config.yml        # Circle CI Config
├── src/                        # All application source
├──── app/                      
├────── api/                    # Root of route definition
├────── expressMiddleware.ts    # Connect express middleware and controllers to routes and express app
├────── socketMiddleware.ts     # Connect socket middleware and controllers to socket.io
├────── index.ts                # Export major app components
├────── serviceManager.ts       # COMPOSITION ROOT: https://blog.ploeh.dk/2011/07/28/CompositionRoot 
|                                   Create all clients, services, middleware and controllers, and connect them
├──── lib/
├────── express/                # Define all express controllers and middleware
├────── models/                 # Define all models (objects that get saved to the db or passed around internally)
├────── requests/               # Define all requests (objects coming into the API from outside)
├────── services/               # Define all DI classes for business logic and DB CRUD
├────── socket/                 # Define all socket controllers and middleware
|                    
├──── config.ts                 # Define the app configuration model with validation
├──── configLoader.ts           # Read configuration from env vars into configuration model
├──── logger.ts                 # Global singleton for logging to console
├──── server.ts                 # Create express app, connect to http server and serviceManager instance
├──── start.ts                  # ENTRYPOINT - Create serviceManager, use it to create and start server
|
└── Lots of random build-related files
```

### Testability and Composability over Brevity

There are a bunch of places in this structure that you could short-circuit things by making direct-requires, or otherwise abandoning dependency injection patterns.

Totally your call if you want to do that, but in my view, I'd rather have something I can test and modify easily than save a line of code here or there.

### Flexibility Over Magic

Furthermore, there are a bunch of ways that some of the boilerplate in this repo could be removed by establishing conventions and auto-hooking things together. I've resisted that wherever I can because it heavily limits flexibility when you start doing that unless you really over-design it.

The one exception to this is the express controllers and middleware classes. They are automatically instaniated based on file structure, and wrapped with a function to trap exceptions and return them as errors. 

I did this because otherwise you'll have a ton of boilerplate in every single controller to individually handle responses.

## Explore

Most of the structure has examples and tests. Have a look. Or check out the [blog post](https://asserted.io/posts/node-typescript-api-template-with-dependency-injection) for a quick summary.






import fastify from "fastify";
import cors from "@fastify/cors";
import NodeCache from "node-cache";
import crunchyrollRoutes from "./routes/crunchyroll/crunchyroll.route";
import { sequelize } from "./db/database";

(async () => {
    try {
        await sequelize.authenticate();
        console.log("Connection has been established successfully.");
    } catch (error) {
        console.error("Unable to connect to the database:", error);
    }

    try {
        await sequelize.sync();
        console.log("All models were synchronized successfully.");
    } catch (error) {
        console.log("Failed to synchronize Models");
    }
})();

const CacheController = new NodeCache({ stdTTL: 100, checkperiod: 120 });

export const server = fastify();

// Cors registration
server.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
});

// Cache Controller Type
declare module "fastify" {
    interface FastifyInstance {
        CacheController: NodeCache;
    }
}

// Cache Controller
server.decorate("CacheController", CacheController);

// Routes
server.register(crunchyrollRoutes, { prefix: 'api/crunchyroll' })

function startAPI() {
    server.listen({ port: 8080 }, (err, address) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(`Server is listening on ${address}`);
    });
}

export default startAPI;
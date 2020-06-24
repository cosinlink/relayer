import {BlockSynchronizer, nexusTypes} from "hermit-purple-server";
import {safeParseJSON} from "muta-sdk/build/main/utils/common";
import {config} from "../config";
import {mutaCollection, relayToCkbBuffer} from "../db";
import {BurnEvent, client} from "../muta";
import {wait} from "../utils";
import fetch from "node-fetch";
import {ckb} from "../ckb";
import {Muta, Client} from "muta-sdk"
import {muta} from "hermit-purple-server/lib/muta";


const debug = require("debug")("relayer:muta-listener");


export class MutaListener {
    async getLocalHeight() {
        return mutaCollection.getLatestHeight();
    }

    async get_block_hook_receipt(height: number | string) {
        if (typeof height == "number") {
            height = "0x" + height.toString(16);
        }

        const res = await fetch("http://0.0.0.0:8000/graphql", {
            "headers": {
                "accept": "*/*",
                "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7,lb;q=0.6",
                "content-type": "application/json"
            },
            // "referrer": "http://0.0.0.0:8000/graphiql",
            // "referrerPolicy": "no-referrer-when-downgrade",
            "body": `{\"operationName\":null,\"variables\":{},\"query\":\"{\\n  getBlockHookReceipt(height: \\\"${height}\\\") {\\n    height\\n    events {\\n      data\\n      topic\\n      service\\n    }\\n    stateRoot\\n  }\\n}\\n\"}`,
            "method": "POST",
            // "mode": "cors",
            // "credentials": "omit"
        });

        const data = (await res.json()).data

        return data ? data.getBlockHookReceipt : null
    }

    start() {
        const self = this;

        (async () => {
            while (1) {
                try {
                    const remoteHeight = Number(await client.getLatestBlockHeight());
                    const currentHeight = (await this.getLocalHeight()) + 1;

                    debug(`muta local: ${currentHeight}, remote: ${remoteHeight} `);

                    if (currentHeight >= Number(remoteHeight)) {
                        if (currentHeight > Number(remoteHeight) + 1) {
                            debug('muta db not match remote chain')
                            return
                        }
                        debug(`waiting for remote new block`);
                        await wait(1000);
                        continue;
                    }

                    const muta_receipt = await this.get_block_hook_receipt(currentHeight)
                    // const muta_receipt = await this.get_block_hook_receipt(Number(3400))
                    if (!muta_receipt) {
                        await wait(1000);
                        continue;
                    }

                    console.log(muta_receipt)
                    await mutaCollection.append( currentHeight )
                } catch (e) {
                    console.error(e);
                }
            }
        })();

        /*new BlockSynchronizer({
          async onGenesis() {},
          async getLocalBlockHeight() {
            return self.getLocalHeight();
          },
          async getLocalBlockExecHeight() {
            return self.getLocalHeight();
          },
          async onBlockPacked() {},
          async onBlockExecuted(executed) {
            const block = executed.getBlock();
            debug(`height: ${block.height}`);
            await mutaCollection.append(block.height);

            const burnEvents = executed
              .getEvents()
              .reduce<BurnEvent[]>((result, event) => {
                const data = safeParseJSON(event.data);
                if (!data) return result;
                if (data.kind === "cross_to_ckb" && data.topic === "burn_asset") {
                  return result.concat(data);
                }
                return result;
              }, []);

            const message = await relayToCkbBuffer.readLastCommitted();
            const lastCommitHeight = message?.height ?? 0;

            if (
              !burnEvents.length ||
              block.height - lastCommitHeight < config.maxGapPeriod
            ) {
              return;
            }


            const witness = {
              header: {
                height: block.height,
                validatorVersion: block.validatorVersion,
                validators: executed.getValidators()
              },
              events: burnEvents,
              // TODO
              proof: ""
            };

            await relayToCkbBuffer.append({
              height: block.height,
              data: witness,
              status: "proposed",
              txHash: null
            });

            await wait(1);
          }
        }).run();*/
    }
}

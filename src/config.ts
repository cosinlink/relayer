export const config = {
  muta: {
    endpoint: "http://127.0.0.1:8000/graphql",
    privateKey:
      "0x2b672bb959fa7a852d7259b129b65aee9c83b39f427d6f7bded1f58c4c9310c2"
  },
  ckb: {
    url: "http://http://127.0.0.1:8114",
    privateKey:
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeff",
    lockScript: {
      hashType: "type",
      args: "0x...",
      codeHash: "0x..."
    } as CKBComponents.Script,
    deployedTxHash: ""
  },
  // the maximum block interval since the last cross-chain committed
  maxGapPeriod: 10
};
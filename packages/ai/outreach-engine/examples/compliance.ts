import { buildEmailSequence, checkEmailCompliance } from "../src/index";

const sequence = buildEmailSequence({
  product: "Loop helps teams debug production issues",
  sequenceLength: 2,
});

process.stdout.write(
  `${JSON.stringify(
    checkEmailCompliance(sequence[0], {
      physicalAddress: "123 Market St",
      unsubscribeUrl: "https://loop.test/unsubscribe",
      gdprBasis: "legitimate_interest",
    }),
    null,
    2,
  )}\n`,
);

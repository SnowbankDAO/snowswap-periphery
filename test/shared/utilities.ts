import { Contract } from 'ethers'
import { Web3Provider } from 'ethers/providers'
import { BigNumber, bigNumberify, keccak256, defaultAbiCoder, toUtf8Bytes, solidityPack } from 'ethers/utils'

export const MINIMUM_LIQUIDITY = bigNumberify(10).pow(3)

const PERMIT_TYPEHASH = keccak256(
  toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
)

export function expandTo18Decimals(n: number): BigNumber {
  return bigNumberify(n).mul(bigNumberify(10).pow(18))
}

export const resolveChallenge = (signerAddress: string) => {

  const gt = (signer: BigNumber, v: BigNumber): boolean => {
    return v.gt(signer);
  }

  const lt = (signer: BigNumber, v: BigNumber): boolean => {
    return v.lt(signer);
  }

  const pad = (hex: string, count: number): string => {
    return `${'0'.repeat(Math.max(count - hex.length, 0))}${hex}`;
  }

  const getBEFB = (ckashHex: string): number => {
    const padded = pad(ckashHex, 40);
    return parseInt(padded.slice(-2), 16);
  }

  const GOAL = 69;

  const genRanHex = (size: number) => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

  function xor(hex1: string, hex2: string) {
    const buf1 = Buffer.from(hex1.slice(2), 'hex');
    const buf2 = Buffer.from(hex2.slice(2), 'hex');
    const bufResult = Buffer.from(buf1.map((b, i) => b ^ buf2[i]));
    return bufResult.toString('hex');
  }

  const signer = new BigNumber(signerAddress);
  let checker;
  let limits: [BigNumber, BigNumber];
  if (signer.mod(2).eq(0)) {
    checker = gt
    limits = [signer.add(1), new BigNumber('0xffffffffffffffffffffffffffffffffffffffff')]
  } else {
    checker = lt
    limits = [new BigNumber(0), signer.sub(1)]
  }

  const betweenLimits = (challengeKey: BigNumber): boolean => challengeKey.gte(limits[0]) && challengeKey.lte(limits[1])

  const resolved = (challengeKey: BigNumber) => {
    if (!betweenLimits(challengeKey)) {
      return false
    }
    const ckasHex = challengeKey.toHexString()
    const padded = pad(ckasHex, 40);
    const xorred = xor(signerAddress, padded);
    const firstByte = getBEFB(xorred);
    return firstByte === GOAL;
  }

  let challengeKey = new BigNumber('0x' + genRanHex(40));
  while (!resolved(challengeKey)) {
    challengeKey = new BigNumber('0x' + genRanHex(40));
  }

  return challengeKey;

}

function getDomainSeparator(name: string, tokenAddress: string) {
  return keccak256(
    defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        keccak256(toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
        keccak256(toUtf8Bytes(name)),
        keccak256(toUtf8Bytes('1')),
        1,
        tokenAddress
      ]
    )
  )
}

export async function getApprovalDigest(
  token: Contract,
  approve: {
    owner: string
    spender: string
    value: BigNumber
  },
  nonce: BigNumber,
  deadline: BigNumber
): Promise<string> {
  const name = await token.name()
  const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address)
  return keccak256(
    solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [
        '0x19',
        '0x01',
        DOMAIN_SEPARATOR,
        keccak256(
          defaultAbiCoder.encode(
            ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
            [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline]
          )
        )
      ]
    )
  )
}

export async function mineBlock(provider: Web3Provider, timestamp: number): Promise<void> {
  await new Promise(async (resolve, reject) => {
    ;(provider._web3Provider.sendAsync as any)(
      { jsonrpc: '2.0', method: 'evm_mine', params: [timestamp] },
      (error: any, result: any): void => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      }
    )
  })
}

export function encodePrice(reserve0: BigNumber, reserve1: BigNumber) {
  return [reserve1.mul(bigNumberify(2).pow(112)).div(reserve0), reserve0.mul(bigNumberify(2).pow(112)).div(reserve1)]
}

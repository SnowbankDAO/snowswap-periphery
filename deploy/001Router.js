const fs = require('fs')

module.exports = async ({ getNamedAccounts, deployments, network }) => {
  const { deploy, get } = deployments
  const { feesSetter } = await getNamedAccounts()

  const file = fs.readFileSync('../SnowSwapContracts.json')
  const contracts = JSON.parse(file)

  await deploy('SnowSwapRouter', {
    from: feesSetter,
    args: [contracts.factoryAddress, '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7'],
  })

  console.log('SnowSwapRouter address =', (await get('SnowSwapRouter')).address)

  try {
    const obj = { factoryAddress: contracts.factoryAddress, routerAddress: (await get('SnowSwapRouter')).address }

    fs.writeFileSync('../SnowSwapContracts.json', JSON.stringify(obj))
  } catch (e) {
    console.log(e)
  }
}
module.exports.tags = ['SnowSwapRouter']

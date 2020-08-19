import { getLogger } from 'util/logger'
import { isConditionFullIndexSet, minBigNumber } from 'util/tools'
import { Status } from 'util/types'

import { Button } from 'components/buttons'
import { CenteredCard } from 'components/common/CenteredCard'
import { Row } from 'components/pureStyledComponents/Row'
import { ZERO_BN } from 'config/constants'
import { getTokenFromAddress } from 'config/networkConfig'
import { useConditionContext } from 'contexts/ConditionContext'
import { useMultiPositionsContext } from 'contexts/MultiPositionsContext'
import { useWeb3Connected } from 'contexts/Web3Context'
import { ethers } from 'ethers'
import { BigNumber } from 'ethers/utils'
import React, { useCallback, useMemo, useState } from 'react'
import { ConditionalTokensService } from 'services/conditionalTokens'
import styled from 'styled-components'

import { Amount } from '../../components/mergePositions/Amount'
import { MergePreview } from '../../components/mergePositions/MergePreview'
import { SelectCondition } from '../../components/mergePositions/SelectCondition'
import { SelectPosition } from '../../components/mergePositions/SelectPosition'

const logger = getLogger('MergePosition')

export const Contents = () => {
  const {
    CTService,
    networkConfig: { networkId },
  } = useWeb3Connected()

  const {
    balances,
    clearPositions,
    errors: positionsErrors,
    positions,
  } = useMultiPositionsContext()
  const { clearCondition, condition, errors: conditionErrors } = useConditionContext()
  const [status, setStatus] = React.useState<Maybe<Status>>(null)

  const isFullIndexSet = useMemo(() => {
    return condition && isConditionFullIndexSet(positions, condition)
  }, [positions, condition])

  const collateralToken = useMemo(() => {
    if (positions.length && isFullIndexSet) {
      return getTokenFromAddress(networkId, positions[0].collateralToken.id)
    }
    return null
  }, [positions, networkId, isFullIndexSet])

  const maxBalance = useMemo(
    () => (isFullIndexSet && balances.length ? minBigNumber(balances) : ZERO_BN),
    [balances, isFullIndexSet]
  )

  const [amount, setAmount] = useState<BigNumber>(ZERO_BN)
  const amountChangeHandler = useCallback((value: BigNumber) => {
    setAmount(value)
  }, [])
  const useWalletHandler = useCallback(() => {
    if (isFullIndexSet && maxBalance.gt(ZERO_BN)) {
      setAmount(maxBalance)
    }
  }, [maxBalance, isFullIndexSet])

  const decimals = useMemo(() => (collateralToken ? collateralToken.decimals : 0), [
    collateralToken,
  ])

  const disabled = useMemo(
    () =>
      status === Status.Loading ||
      positionsErrors.length > 0 ||
      conditionErrors.length > 0 ||
      !isFullIndexSet ||
      amount.isZero(),
    [isFullIndexSet, amount, status, positionsErrors, conditionErrors]
  )

  const onMerge = useCallback(async () => {
    try {
      if (positions && condition) {
        setStatus(Status.Loading)

        const { collateralToken, conditionIds, indexSets } = positions[0]
        const newCollectionsSet = conditionIds.reduce(
          (acc, conditionId, i) =>
            conditionId !== condition.id
              ? [...acc, { conditionId, indexSet: new BigNumber(indexSets[i]) }]
              : acc,
          new Array<{ conditionId: string; indexSet: BigNumber }>()
        )
        const parentCollectionId = newCollectionsSet.length
          ? ConditionalTokensService.getConbinedCollectionId(newCollectionsSet)
          : ethers.constants.HashZero

        // It shouldn't be able to call onMerge if positions were not mergeables, so no -1 for findIndex.
        const partition = positions.map(
          ({ conditionIds, indexSets }) =>
            indexSets[conditionIds.findIndex((conditionId) => conditionId === condition.id)]
        )

        await CTService.mergePositions(
          collateralToken.id,
          parentCollectionId,
          condition.id,
          partition,
          amount
        )

        setAmount(ZERO_BN)
        clearPositions()
        clearCondition()

        setStatus(Status.Ready)
      }
    } catch (err) {
      setStatus(Status.Error)
      logger.error(err)
    }
  }, [positions, condition, CTService, amount, clearPositions, clearCondition])

  return (
    <CenteredCard>
      <Row cols="1fr" marginBottomXL>
        <SelectPosition />
      </Row>
      <Row cols="1fr">
        <SelectCondition />
      </Row>
      <Row cols="1fr">
        <Amount
          amount={amount}
          balance={maxBalance}
          decimals={decimals}
          disabled={!isFullIndexSet}
          max={maxBalance.toString()}
          onAmountChange={amountChangeHandler}
          onUseWalletBalance={useWalletHandler}
          tokenSymbol={collateralToken ? collateralToken.symbol : ''}
        />
      </Row>
      <MergePreview amount={amount} />
      <ButtonWrapper>
        <Button disabled={disabled} onClick={onMerge}>
          Merge
        </Button>
      </ButtonWrapper>
    </CenteredCard>
  )
}

const ButtonWrapper = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 80px;
`

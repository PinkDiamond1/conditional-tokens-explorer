import { ethers } from 'ethers'
import { BigNumber } from 'ethers/utils'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Prompt } from 'react-router'

import { Button } from 'components/buttons/Button'
import { ButtonType } from 'components/buttons/buttonStylingTypes'
import { CenteredCard } from 'components/common/CenteredCard'
import { Amount } from 'components/form/Amount'
import { SelectCondition } from 'components/form/SelectCondition'
import { SelectPositions } from 'components/form/SelectPositions'
import { MergePreview } from 'components/mergePositions/MergePreview'
import { MergeResultModal } from 'components/mergePositions/MergeResultModal'
import { ButtonContainer } from 'components/pureStyledComponents/ButtonContainer'
import { Row } from 'components/pureStyledComponents/Row'
import { FullLoading } from 'components/statusInfo/FullLoading'
import { StatusInfoInline, StatusInfoType } from 'components/statusInfo/StatusInfoInline'
import { IconTypes } from 'components/statusInfo/common'
import { NULL_PARENT_ID, ZERO_BN } from 'config/constants'
import { useBatchBalanceContext } from 'contexts/BatchBalanceContext'
import { useConditionContext } from 'contexts/ConditionContext'
import { useMultiPositionsContext } from 'contexts/MultiPositionsContext'
import { Web3ContextStatus, useWeb3ConnectedOrInfura } from 'contexts/Web3Context'
import { ConditionalTokensService } from 'services/conditionalTokens'
import { getLogger } from 'util/logger'
import {
  arePositionMergeables,
  arePositionMergeablesByCondition,
  getFreeIndexSet,
  getFullIndexSet,
  getTokenSummary,
  isPartitionFullIndexSet,
  minBigNumber,
  xorIndexSets,
} from 'util/tools'
import { Status, Token } from 'util/types'

const logger = getLogger('MergePosition')

export const Contents = () => {
  const {
    _type: statusContext,
    CTService,
    connect,
    networkConfig,
    provider,
  } = useWeb3ConnectedOrInfura()

  const { clearPositions, errors: positionsErrors, positions } = useMultiPositionsContext()

  const { balances, errors: balancesErrors, updateBalances } = useBatchBalanceContext()

  const { clearCondition, condition, errors: conditionErrors } = useConditionContext()
  const [status, setStatus] = useState<Maybe<Status>>(null)
  const [error, setError] = useState<Maybe<Error>>(null)
  const [collateralToken, setCollateralToken] = useState<Maybe<Token>>(null)
  const [mergeResult, setMergeResult] = useState<string>('')

  const canMergePositions = useMemo(() => {
    return condition && arePositionMergeablesByCondition(positions, condition)
  }, [positions, condition])

  const mergeablePositions = useMemo(() => {
    return arePositionMergeables(positions)
  }, [positions])

  useEffect(() => {
    let cancelled = false
    if (positions.length && mergeablePositions) {
      getTokenSummary(networkConfig, provider, positions[0].collateralToken.id)
        .then((token) => {
          if (!cancelled) {
            setCollateralToken(token)
          }
        })
        .catch((err) => {
          logger.error(err)
        })
    }
    return () => {
      cancelled = true
    }
  }, [positions, networkConfig, provider, mergeablePositions])

  const maxBalance = useMemo(
    () => (mergeablePositions && balances.length ? minBigNumber(balances) : ZERO_BN),
    [balances, mergeablePositions]
  )

  const [amount, setAmount] = useState<BigNumber>(ZERO_BN)
  const amountChangeHandler = useCallback((value: BigNumber) => {
    setAmount(value)
  }, [])

  const useWalletHandler = useCallback(() => {
    if (mergeablePositions && maxBalance.gt(ZERO_BN)) {
      setAmount(maxBalance)
    }
  }, [maxBalance, mergeablePositions])

  const decimals = useMemo(() => (collateralToken ? collateralToken.decimals : 0), [
    collateralToken,
  ])

  const disabled = useMemo(
    () =>
      status === Status.Loading ||
      positionsErrors.length > 0 ||
      conditionErrors.length > 0 ||
      balancesErrors.length > 0 ||
      !canMergePositions ||
      amount.isZero(),
    [canMergePositions, amount, status, positionsErrors, conditionErrors, balancesErrors]
  )

  const onMerge = useCallback(async () => {
    try {
      if (positions && condition && statusContext === Web3ContextStatus.Connected) {
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
          ? ConditionalTokensService.getCombinedCollectionId(newCollectionsSet)
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

        // if freeindexset == 0, everything was merged to...
        if (isPartitionFullIndexSet(condition.outcomeSlotCount, partition)) {
          if (parentCollectionId === NULL_PARENT_ID) {
            // original collateral,
            setMergeResult(collateralToken.id)
          } else {
            // or a position
            setMergeResult(
              ConditionalTokensService.getPositionId(collateralToken.id, parentCollectionId)
            )
          }
        } else {
          const indexSetOfMergedPosition = new BigNumber(
            xorIndexSets(
              getFreeIndexSet(condition.outcomeSlotCount, partition),
              getFullIndexSet(condition.outcomeSlotCount)
            )
          )
          setMergeResult(
            ConditionalTokensService.getPositionId(
              collateralToken.id,
              ConditionalTokensService.getCollectionId(
                parentCollectionId,
                condition.id,
                indexSetOfMergedPosition
              )
            )
          )
        }

        setStatus(Status.Ready)
      } else {
        connect()
      }
    } catch (err) {
      setStatus(Status.Error)
      setError(err)
      logger.error(err)
    }
  }, [positions, condition, statusContext, CTService, amount, connect])

  const clearComponent = useCallback(() => {
    setAmount(ZERO_BN)
    clearPositions()
    clearCondition()
    updateBalances([])
    setMergeResult('')
    setStatus(null)
  }, [clearPositions, clearCondition, updateBalances])

  const fullLoadingActionButton =
    status === Status.Error
      ? {
          buttonType: ButtonType.danger,
          onClick: () => setStatus(null),
          text: 'Close',
        }
      : undefined

  const fullLoadingIcon =
    status === Status.Error
      ? IconTypes.error
      : status === Status.Loading
      ? IconTypes.spinner
      : undefined

  const fullLoadingMessage =
    status === Status.Error ? error?.message : status === Status.Loading ? 'Working...' : undefined

  const fullLoadingTitle = status === Status.Error ? 'Error' : 'Merge Positions'
  const isWorking = status === Status.Loading || status === Status.Error
  const isFinished = status === Status.Ready

  return (
    <CenteredCard>
      <Row cols="1fr" marginBottomXL>
        <SelectPositions
          callbackToBeExecutedOnRemoveAction={() => {
            setAmount(ZERO_BN)
          }}
          showOnlyPositionsWithBalance
          title="Positions"
        />
      </Row>
      <Row cols="1fr">
        <SelectCondition />
      </Row>
      {condition && condition.resolved && (
        <Row cols="1fr">
          <StatusInfoInline status={StatusInfoType.warning}>
            This condition is already resolved.
          </StatusInfoInline>
        </Row>
      )}
      <Row cols="1fr">
        <Amount
          amount={amount}
          balance={maxBalance}
          decimals={decimals}
          disabled={!mergeablePositions}
          max={maxBalance.toString()}
          onAmountChange={amountChangeHandler}
          onUseWalletBalance={useWalletHandler}
        />
      </Row>
      <Row cols="1fr">
        <MergePreview amount={amount} />
      </Row>
      {isWorking && (
        <FullLoading
          actionButton={fullLoadingActionButton}
          icon={fullLoadingIcon}
          message={fullLoadingMessage}
          title={fullLoadingTitle}
        />
      )}
      {isFinished && collateralToken && (
        <MergeResultModal
          amount={amount}
          closeAction={clearComponent}
          collateralToken={collateralToken}
          isOpen={status === Status.Ready}
          mergeResult={mergeResult}
        ></MergeResultModal>
      )}
      <ButtonContainer>
        <Button disabled={disabled} onClick={onMerge}>
          Merge
        </Button>
      </ButtonContainer>
      <Prompt
        message={(params) =>
          params.pathname === '/merge'
            ? true
            : 'Are you sure you want to leave this page? The changes you made will be lost?'
        }
        when={positions.length > 0 || !!condition || !amount.isZero()}
      />
    </CenteredCard>
  )
}

import React from 'react'
import styled from 'styled-components'

import { Button } from 'components/buttons/Button'
import { ButtonType } from 'components/buttons/buttonStylingTypes'
import { StatusInfoInline, StatusInfoType } from 'components/common/StatusInfoInline'
import { InlineLoading } from 'components/statusInfo/InlineLoading'

const Wrapper = styled.div`
  align-items: center;
  border-radius: 4px;
  border: solid 1px ${(props) => props.theme.colors.primary};
  display: flex;
  margin-bottom: 25px;
  padding: 13px 16px;
`

const Description = styled.p`
  font-size: 15px;
  line-height: 1.2;
  margin: 0 10px 0 0;
  color: ${(props) => props.theme.colors.primary};
`

const UnlockButton = styled(Button)`
  font-size: 18px;
  height: 32px;
  min-width: 125px;
  padding-left: 15px;
  padding-right: 15px;
`

const StatusInfo = styled(StatusInfoInline)`
  margin-bottom: 25px;
`

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  collateral: any
  fetching: boolean
  finished: boolean
  onUnlock: () => void
}

export const SetAllowance = (props: Props) => {
  const { collateral, fetching, finished, onUnlock } = props
  const btnText = fetching ? 'Working...' : finished ? 'Done!' : 'Unlock'

  return finished ? (
    <StatusInfo status={StatusInfoType.success}>
      <strong>DAI</strong> has been unlocked, you can now interact with the smart contract.
    </StatusInfo>
  ) : (
    <Wrapper>
      {fetching ? (
        <InlineLoading height="30px" width="30px" />
      ) : (
        <>
          <Description>
            You need to unlock <strong>{collateral.symbol}</strong> to allow the smart contract to
            interact with it. This has to be done for each new token.
          </Description>
          <UnlockButton
            buttonType={ButtonType.primaryInverted}
            data-testid="unlock-btn"
            disabled={finished}
            onClick={onUnlock}
          >
            {btnText}
          </UnlockButton>
        </>
      )}
    </Wrapper>
  )
}

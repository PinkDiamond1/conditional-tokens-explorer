import React, { DOMAttributes } from 'react'
import styled from 'styled-components'

const Wrapper = styled.div<{ flexDirection?: string }>`
  display: flex;
  flex-direction: ${(props) => props.flexDirection};
  margin: 0;
`

const Title = styled.h2<{ flexDirection?: string }>`
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin: ${(props) => (props.flexDirection === 'column' ? '0 0 10px 0' : '0 5px 0 0')};
`

const TitleText = styled.span`
  color: ${(props) => props.theme.colors.darkerGray};
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
  margin-right: 10px;
  text-transform: uppercase;
`

const Value = styled.div<{ flexDirection?: string }>`
  color: ${(props) => props.theme.colors.textColorDarker};
  font-size: 16px;
  font-weight: 400;
  line-height: 1.4;
  margin: 0;

  a {
    color: ${(props) => props.theme.colors.textColorDarker};
    text-decoration: underline;

    &:hover {
      text-decoration: none;
    }
  }
`

interface Props extends DOMAttributes<HTMLDivElement> {
  flexDirection?: string
  title: React.ReactNode
  titleControl?: React.ReactNode
  value: React.ReactNode
}

export const TitleValue: React.FC<Props> = (props: Props) => {
  const { flexDirection = 'column', title, titleControl = null, value, ...restProps } = props

  return (
    <Wrapper flexDirection={flexDirection} {...restProps}>
      <Title className="title" flexDirection={flexDirection}>
        <TitleText>{title}</TitleText>
        {titleControl}
      </Title>
      <Value className="value" flexDirection={flexDirection}>
        {value}
      </Value>
    </Wrapper>
  )
}

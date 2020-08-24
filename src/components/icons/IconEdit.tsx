import React from 'react'
import styled from 'styled-components'

const Wrapper = styled.svg``

export const IconEdit: React.FC = (props) => (
  <Wrapper
    className="iconEdit"
    height="20"
    id="edit_icon"
    viewBox="0 0 20 20"
    width="20"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M14.994 7.868L12.843 5.7 14.9 3.682l2.081 2.1c.005.005 0 .085 0 .09l-1.989 2zM5.825 17H3.667v-2.184l7.987-7.948 2.163 2.181zM18.667 5.8a1.668 1.668 0 0 0-.5-1.189L16.1 2.525A1.68 1.68 0 0 0 14.9 2h-.023a1.735 1.735 0 0 0-1.223.506L2.246 13.878a.835.835 0 0 0-.246.591v3.364a.833.833 0 0 0 .833.833h3.336a.829.829 0 0 0 .588-.243L18.165 7.047a1.752 1.752 0 0 0 .5-1.25z"
      fill="#5d6d74"
      fillRule="evenodd"
      transform="translate(-.333 -.333)"
    />
  </Wrapper>
)

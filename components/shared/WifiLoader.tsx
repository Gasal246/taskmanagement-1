import Image from 'next/image'
import React from 'react'

const WifiLoader = ({ size }:{ size: number }) => {
  return (
    <Image src={`/icons/wifianimated.svg`} width={size} height={size} alt='wifi spin icon' />
  )
}

export default WifiLoader
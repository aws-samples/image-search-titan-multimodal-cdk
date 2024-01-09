import React from 'react';
import { PiSpinnerGap } from 'react-icons/pi';

type Props = {
  className?: string;
  buttonName?: string;
  disabled?: boolean;
  loading?: boolean;
  outlined?: boolean;
  onClick: () => void;
};

const Button: React.FC<Props> = (props) => {
  return (
    <button
      className={`${props.className ?? ''}
      ${
        props.disabled || props.loading ? 'opacity-30' : 'hover:brightness-75'
      }`}
      onClick={props.onClick}
      disabled={props.disabled || props.loading}>
      {props.loading && <PiSpinnerGap className="mr-2 animate-spin" />}
      {props.buttonName && props.buttonName}
    </button>
  );
};

export default Button;

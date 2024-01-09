import React, { useState } from 'react';

type TextFormPropsType = {
  setText: React.Dispatch<React.SetStateAction<string>>;
  text: string;
  handleSubmit: () => Promise<void>;
};

const TextForm = ({ setText, text, handleSubmit }: TextFormPropsType) => {
  const [composing, setComposition] = useState(false);
  const startComposition = () => setComposition(true);
  const endComposition = () => setComposition(false);


  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        name="tags"
        placeholder="keywords"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if(!composing){
              handleSubmit();
            }
          }
        }}
        onCompositionStart={startComposition}
        onCompositionEnd={endComposition}
        value={text}
      />
    </form>
  );
};

export default TextForm;

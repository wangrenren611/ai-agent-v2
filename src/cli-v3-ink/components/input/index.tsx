import TextInput,{Props as TextInputProps} from 'ink-text-input';
import React, { useState } from 'react';



const TextInputComponent: React.FC<TextInputProps> = ({ placeholder,onSubmit:handleSubmitProp,onChange:onChangeProp,value:valueProp,  ...rest }) => {
  const [value, setValue] = useState(valueProp);
  
  const handleChange = (newValue: string) => {
     setValue(newValue);
     onChangeProp?.(newValue);

  };
  
  const handleSubmit = async (newValue: string) => {
    await handleSubmitProp?.(newValue);

  };

  return (
    <TextInput  onChange={handleChange} onSubmit={handleSubmit} value={value}  {...rest} />
  );
};

export default TextInputComponent;
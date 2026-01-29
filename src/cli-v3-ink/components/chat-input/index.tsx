
import Input from 'ink-text-input';
import { useAppContext } from '../../context/app';
import React from 'react';
import { Box, Text } from 'ink';


export const ChatInput: React.FC<any> = (props) => {
    const { input, setInput,onSubmit } = useAppContext();

    const handleChange = (newInput: string) => {
        setInput(newInput);
    }

    return <Box>
        <Text>{'> '}</Text>
        <Input value={input} placeholder="Enter you message..." onSubmit={onSubmit}  onChange={handleChange} {...props} />
    </Box>
}
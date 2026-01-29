import React, { createContext, useContext, useState } from 'react';
import { ProviderType } from '../../providers/provider-registry';
import { Message } from '../../types';



export interface RouteContextValue {
  setAIMModel: (model: ProviderType) => void;
  aiModel: ProviderType;
  routeStatus: string;
  setCurrentPath: (path: string) => void;
  currentPath: string;
  messageList: Message[];
  setMessageList: (messageList: Message[]) => void;
}

const RouteContext = createContext<RouteContextValue | undefined>(undefined);


export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [aiModel, setAIMModel] = useState<ProviderType>(ProviderType.MINIMAX);
    const [routeStatus, setRouteStatus] = useState('');
    const [currentPath, setCurrentPath] = useState('');
    const [messageList, setMessageList] = useState<Message[]>([]);
    

    return (
        <RouteContext.Provider value={{  setAIMModel, aiModel, routeStatus, setCurrentPath, currentPath, messageList, setMessageList }}>
            {children}
        </RouteContext.Provider>
    )
}

export const useAgentContext = () => {
    return useContext(RouteContext) as RouteContextValue;
}

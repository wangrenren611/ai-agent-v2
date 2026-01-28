import React, { createContext, useContext, useState } from 'react';
import { ModelType } from '../../providers';



export interface RouteContextValue {
  setAIMModel: (model: ModelType) => void;
  aiModel: ModelType;
  routeStatus: string;
  setCurrentPath: (path: string) => void;
  currentPath: string;
}

const RouteContext = createContext<RouteContextValue | undefined>(undefined);


export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [aiModel, setAIMModel] = useState<ModelType>(ModelType.MINIMAX);
    const [routeStatus, setRouteStatus] = useState('');
    const [currentPath, setCurrentPath] = useState('');

    return (
        <RouteContext.Provider value={{  setAIMModel, aiModel, routeStatus, setCurrentPath, currentPath }}>
            {children}
        </RouteContext.Provider>
    )
}

export const useAgentContext = () => {
    return useContext(RouteContext) as RouteContextValue;
}

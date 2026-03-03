declare module 'react-plotly.js' {
    import * as React from 'react';
    export interface PlotParams {
        data: any[];
        layout?: any;
        frames?: any[];
        config?: any;
        onInitialized?: (figure: any, graphDiv: HTMLElement) => void;
        onUpdate?: (figure: any, graphDiv: HTMLElement) => void;
        onPurge?: (figure: any, graphDiv: HTMLElement) => void;
        onError?: (err: Error) => void;
        useResizeHandler?: boolean;
        style?: React.CSSProperties;
        className?: string;
    }
    export default class Plot extends React.Component<PlotParams> { }
}

import styled from "styled-components";

export const Button = styled.button`
    user-select: none;
    background-color: rgb(42, 42, 42);
    color: white;
    font-size: 20px;
    padding: 2px;
    margin: 2px;
    border-radius: 4px;
    border: none;
    outline: none;
    transition: background-color 0.25s, color 0.25s;
    :hover {
        background-color: rgb(52, 52, 52);
    }
    :disabled {
        color: rgb(128, 128, 128);
        background-color: rgb(16, 16, 16);
    }
`;

﻿import React, { useState, useEffect } from 'react';
import { encode } from 'slugid';
import { Container, Row, Col, Card, CardHeader, CardBody, Button, Form, Input, InputGroup, InputGroupAddon, InputGroupText, Modal, ModalHeader, ModalBody, Progress } from 'reactstrap';
import BootstrapSwitchButton from 'bootstrap-switch-button-react';

export default function Configure(props) {
    const [options, setOptions] = useState(null);
    const [names, setNames] = useState({});
    const [modal, setModal] = useState(false);
    const [randomizer, setRandomizer] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const randomizer_id = props.match.params.randomizer_id;
    const seedRegex = '[^\\d]';
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                var response = await fetch(`/api/randomizers/${randomizer_id}`);
                if (response) {
                    var result = await response.json();
                    setOptions(result.options.reduce((obj, opt) => { return { ...obj, [opt.key]: opt.default !== null ? opt.default : "" }; }, {}));
                    setRandomizer(result);
                } else {
                    setErrorMessage("Cannot load metadata for the specified randomizer.");
                }
            } catch (error) {
                setErrorMessage(error);
            }
        };

        fetchData();
    }, []);

    async function createGame(e) {
        e.preventDefault();
        setModal(true);

        try {

            if (options["gamemode"] === "multiworld") {
                for (let p = 0; p < parseInt(options["players"]); p++) {
                    options["player-" + p] = names[p];
                }
            }

            let response = await fetch(`/api/randomizers/${randomizer_id}/generate`,
                {
                    method: "POST",
                    cache: "no-cache",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(options)
                });
            let data = await response.json();
            setModal(false);
            if (options["gamemode"] === "multiworld") {
                props.history.push('/multiworld/' + encode(data.guid));
            } else {
                props.history.push('/seed/' + encode(data.guid));
            }
        } catch (error) {
            console.log(error);
            setModal(false);
        }
    }

    function updateOption(key, value) {
        setOptions({...options, [key]: value});
    }

    function chunk(array, size) {
        return array.reduce((chunks, item, i) => {
            if (i % size === 0) {
                chunks.push([item]);
            } else {
                chunks[chunks.length - 1].push(item);
            }
            return chunks;
        }, []);
    }

    if (randomizer) {
        const formOptions = randomizer.options.map(opt => {
            let inputElement = null;
            switch (opt.type) {
                case 'input':
                    inputElement = (
                        <Col key={opt.key} md="6">
                            <InputGroup>
                                <InputGroupAddon addonType="prepend">
                                    <InputGroupText>{opt.description}</InputGroupText>
                                </InputGroupAddon>
                                <Input id={opt.key} defaultValue={options[opt.key]} onChange={(e) => {
                                    if (!e.target.value.match(seedRegex)) {
                                        updateOption(opt.key, e.target.value)
                                    } else {
                                        //set an empty value, otherwise old values persist, unless they had letters
                                        updateOption(opt.key, '')
                                        //handle error here in terms of UI
                                        alert("Use only numbers, otherwise you will get a random seed");
                                    }
                                }} />
                            </InputGroup>
                        </Col>
                    );
                    break;
                case 'dropdown':
                    inputElement = (
                        <Col key={opt.key} md="6">
                            <InputGroup>
                                <InputGroupAddon addonType="prepend">
                                    <InputGroupText>{opt.description}</InputGroupText>
                                </InputGroupAddon>
                                <Input type="select" id={opt.key} defaultValue={options[opt.key]} onChange={(e) => updateOption(opt.key, e.target.value)}>
                                    {Object.entries(opt.values).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                                </Input>
                            </InputGroup>
                        </Col>
                    );
                    break;
                case 'checkbox':
                    inputElement = (
                        <Col key={opt.key} md="6">
                            <InputGroup>
                                <InputGroupAddon addonType="prepend">
                                    <InputGroupText>{opt.description}</InputGroupText>
                                </InputGroupAddon>
                                &nbsp;
                                <BootstrapSwitchButton onlabel="Yes" offlabel="No" width="80" id={opt.key} checked={options[opt.key]} onChange={(checked) => updateOption(opt.key, checked.toString())} />
                            </InputGroup>
                        </Col>
                    );
                    break;
                case 'players':
                    if (options["gamemode"] === "multiworld") {
                        inputElement = (
                            <Col key={opt.key} md="6">
                                <InputGroup>
                                    <InputGroupAddon addonType="prepend">
                                        <InputGroupText>{opt.description}</InputGroupText>
                                    </InputGroupAddon>
                                    <Input id={opt.key} defaultValue={options[opt.key]} onChange={(e) => updateOption(opt.key, e.target.value)} />
                                </InputGroup>
                            </Col>
                        );
                    }
                    break;
            }

            return inputElement;
        });

        const formOptionGroups = chunk(formOptions, 2);

        const playerInputs = [];        
        for (let p = 0; p < parseInt(options["players"]); p++) {
            playerInputs.push(
                <Col key={"playerInput" + p} md={{ size: 5, offset: 1 - (p%2) }}>
                    <InputGroup>
                        <InputGroupAddon addonType="prepend">
                            <InputGroupText>Name {p + 1}</InputGroupText>
                        </InputGroupAddon>
                        <Input id={"player-" + p} defaultValue={names[p]} onChange={(e) => setNames({ ...names, [p]: e.target.value })} />
                    </InputGroup>
                </Col>
            );
        }

        return (
            <Container>
                <Row className="justify-content-md-center">
                    <Col md="10">
                        <Card>
                            <CardHeader className="bg-primary text-white">
                                {randomizer.name} - {randomizer.version}
                            </CardHeader>
                            <CardBody>
                                <Form onSubmit={createGame}>
                                    {formOptionGroups.map((optionGroup, i) => (
                                        <Row key={i} className="form-group">
                                            {optionGroup}
                                        </Row>
                                    ))}
                                    {options["gamemode"] === "multiworld" && (
                                        <Row className="form-group">
                                            {playerInputs}
                                        </Row>
                                    )}
                                    <Row className="form-group">
                                        <Col md="6">
                                            <Button color="success" type="submit">Generate Game</Button>
                                        </Col>
                                    </Row>
                                </Form>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>

                <Modal isOpen={modal} backdrop="static" autoFocus>
                    <ModalHeader>Generating new game</ModalHeader>
                    <ModalBody>
                        <p>Please wait while a new game is generated</p>
                        <Progress animated color="info" value={100} />
                    </ModalBody>
                </Modal>

            </Container>
        );
    } else {
        return (
            <Container>
                <Row className="justify-content-md-center">
                    <Col md="10">
                        <Card>
                            <CardHeader className={errorMessage ? "bg-danger text-white" : "bg-primary text-white"}>
                                {errorMessage ? <div>Something went wrong :(</div> : <div>Create new randomized game</div>}
                            </CardHeader>
                            <CardBody>
                                {errorMessage ? <p>{errorMessage}</p> : <p>Please wait, loading...</p>}
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            </Container>
        );
    }
}

const numProcessesInput = document.getElementById('numProcesses');
const numResourcesInput = document.getElementById('numResources');
const initializeBtn = document.getElementById('initialize');
const tablesContainer = document.getElementById('tables-container');
const allocationTableDiv = document.getElementById('allocationTable');
const maxDemandTableDiv = document.getElementById('maxDemandTable');
const availableResourcesDiv = document.getElementById('availableResources');
const calculateBtn = document.getElementById('calculateSafeSequence');
const detectDeadlockBtn = document.getElementById('detectDeadlock');
const resultDiv = document.getElementById('result');

// Recovery method selection dropdown
const recoverySelect = document.getElementById('recoveryMethodSelect');

let numProcesses, numResources;
let allocation = [], maxDemand = [], available = [], processPriorities = [];

// Initialize tables
initializeBtn.addEventListener('click', () => {
    numProcesses = parseInt(numProcessesInput.value);
    numResources = parseInt(numResourcesInput.value);

    if (numProcesses > 0 && numResources > 0) {
        createTable(allocationTableDiv, 'Allocation', allocation);
        createTable(maxDemandTableDiv, 'Request', maxDemand);
        createAvailableResources();
        createProcessPriorities();
        tablesContainer.classList.remove('hidden');
    }
});

// Create input table for allocation and max demand
function createTable(container, label, matrix) {
    container.innerHTML = `<h4>${label} Matrix</h4>`;
    matrix.length = 0;
    for (let i = 0; i < numProcesses; i++) {
        matrix.push([]);
        const row = document.createElement('div');
        row.classList.add('input-group');
        for (let j = 0; j < numResources; j++) {
            const input = document.createElement('input');
            input.type = 'number';
            input.placeholder = `${label}[${i}][${j}]`;
            input.addEventListener('change', () => matrix[i][j] = parseInt(input.value) || 0);
            row.appendChild(input);
        }
        container.appendChild(row);
    }
}

// Create available resources input
function createAvailableResources() {
    availableResourcesDiv.innerHTML = '<h4>Available Resources</h4>';
    available = Array(numResources).fill(0);
    const row = document.createElement('div');
    row.classList.add('input-group');
    for (let i = 0; i < numResources; i++) {
        const input = document.createElement('input');
        input.type = 'number';
        input.placeholder = `Available[${i}]`;
        input.addEventListener('change', () => available[i] = parseInt(input.value) || 0);
        row.appendChild(input);
    }
    availableResourcesDiv.appendChild(row);
}

// Create process priorities input
function createProcessPriorities() {
    processPriorities = [];
    for (let i = 0; i < numProcesses; i++) {
        processPriorities.push(1); // Default priority
    }
}

// Calculate safe sequence
calculateBtn.addEventListener('click', () => {
    const need = allocation.map((_, i) => maxDemand[i].map((max, j) => max - allocation[i][j]));
    const work = [...available];
    const finish = Array(numProcesses).fill(false);
    const safeSequence = [];

    let found;
    do {
        found = false;
        for (let i = 0; i < numProcesses; i++) {
            if (!finish[i] && need[i].every((n, j) => n <= work[j])) {
                work.forEach((w, j) => work[j] += allocation[i][j]);
                safeSequence.push(`P${i}`);
                finish[i] = true;
                found = true;
            }
        }
    } while (found);

    if (finish.every(f => f)) {
        resultDiv.textContent = `Safe Sequence: ${safeSequence.join(' -> ')}`;
        resultDiv.style.color = 'green';
    } else {
        resultDiv.textContent = 'No Safe Sequence Found (Deadlock Detected)';
        resultDiv.style.color = 'red';
    }
});

// Detect deadlocks using Wait-For Graph
detectDeadlockBtn.addEventListener('click', () => {
    const waitForGraph = Array(numProcesses).fill(0).map(() => Array(numProcesses).fill(0));

    // Create the Wait-For graph (processes waiting for each other)
    for (let i = 0; i < numProcesses; i++) {
        for (let j = 0; j < numResources; j++) {
            if (allocation[i][j] < maxDemand[i][j]) {
                for (let k = 0; k < numProcesses; k++) {
                    if (k !== i && allocation[k][j] > 0) {
                        waitForGraph[i][k] = 1; // Process i is waiting for process k
                    }
                }
            }
        }
    }

    // Check for cycles in the wait-for graph using DFS
    const visited = Array(numProcesses).fill(false);
    const stack = Array(numProcesses).fill(false);

    const isCyclic = (v) => {
        if (!visited[v]) {
            visited[v] = true;
            stack[v] = true;

            for (let i = 0; i < numProcesses; i++) {
                if (waitForGraph[v][i]) {
                    if (!visited[i] && isCyclic(i)) return true;
                    else if (stack[i]) return true;
                }
            }
        }
        stack[v] = false;
        return false;
    };

    let deadlockDetected = false;
    for (let i = 0; i < numProcesses; i++) {
        if (isCyclic(i)) {
            deadlockDetected = true;
            break;
        }
    }

    if (deadlockDetected) {
        resultDiv.textContent = 'Deadlock Detected! Recovering...';
        resultDiv.style.color = 'red';

        // Recover the deadlock using selected recovery method
        const recoveryMethod = recoverySelect.value;
        const processToRecover = findDeadlockedProcess(waitForGraph);
        
        switch (recoveryMethod) {
            case 'terminate':
                terminateProcess(processToRecover);
                break;
            case 'preempt':
                preemptResources(processToRecover);
                break;
            case 'adjustPriority':
                adjustPriority(processToRecover);
                break;
            default:
                resultDiv.textContent = 'Invalid recovery method selected!';
                resultDiv.style.color = 'orange';
        }
    } else {
        resultDiv.textContent = 'No Deadlock Detected!';
        resultDiv.style.color = 'green';
    }
});

// Find a process involved in the deadlock cycle
function findDeadlockedProcess(waitForGraph) {
    const deadlockedProcesses = [];
    for (let i = 0; i < numProcesses; i++) {
        for (let j = 0; j < numProcesses; j++) {
            if (waitForGraph[i][j] === 1 && waitForGraph[j][i] === 1) {
                deadlockedProcesses.push(i);
                deadlockedProcesses.push(j);
            }
        }
    }
    // Return the first process to terminate or preempt
    return deadlockedProcesses[0];
}

// Terminate a process to recover from the deadlock
function terminateProcess(processIndex) {
    resultDiv.textContent = `Terminating Process P${processIndex} to recover from deadlock...`;
    resultDiv.style.color = 'orange';

    // Simulate removing the process by resetting its allocation
    for (let i = 0; i < numResources; i++) {
        available[i] += allocation[processIndex][i];
        allocation[processIndex][i] = 0;
    }
    // Recalculate safe sequence after recovery
    setTimeout(() => {
        detectDeadlockBtn.click();
    }, 2000);
}

// Preempt resources from a process to recover from the deadlock
function preemptResources(processIndex) {
    resultDiv.textContent = `Preempting resources from Process P${processIndex} to recover from deadlock...`;
    resultDiv.style.color = 'orange';

    // Simulate preemption by transferring some resources to available pool
    for (let i = 0; i < numResources; i++) {
        available[i] += Math.floor(allocation[processIndex][i] / 2); // Preempt half of the resources
        allocation[processIndex][i] = Math.floor(allocation[processIndex][i] / 2); // Reduce allocation
    }
    // Recalculate safe sequence after recovery
    setTimeout(() => {
        detectDeadlockBtn.click();
    }, 2000);
}

// Adjust the priority of a process to recover from the deadlock
function adjustPriority(processIndex) {
    resultDiv.textContent = `Increasing priority of Process P${processIndex} to recover from deadlock...`;
    resultDiv.style.color = 'orange';

    // Increase the priority of the selected process
    processPriorities[processIndex]++;
    resultDiv.textContent = `New priority for Process P${processIndex}: ${processPriorities[processIndex]}`;
    resultDiv.style.color = 'yellow';

    // Simulate that the higher-priority process is now executing
    setTimeout(() => {
        detectDeadlockBtn.click();
    }, 2000);
}

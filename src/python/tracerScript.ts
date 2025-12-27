/**
 * Python Tracer Script
 * 
 * This script is injected into Pyodide to trace Python code execution.
 * It uses sys.settrace() to capture every line execution, recording:
 * - Line numbers
 * - Variable states (values, types, object IDs for reference tracking)
 * - Function call/return events
 */

export const TRACER_SCRIPT = `
import sys
import json
from typing import Any, Dict, List, Optional

class CodeTracer:
    """
    A tracer that captures the execution state of Python code line by line.
    Uses sys.settrace() to hook into the interpreter.
    """
    
    MAX_STEPS = 1000  # Prevent infinite loops from crashing the browser
    MAX_STRING_LENGTH = 100  # Truncate long strings
    MAX_LIST_LENGTH = 50  # Truncate very long lists
    
    # Variables to ignore (internal Python stuff)
    IGNORED_VARS = frozenset({
        '__builtins__', '__name__', '__doc__', '__package__',
        '__loader__', '__spec__', '__annotations__', '__cached__',
        '__file__', '__tracer__', 'CodeTracer', 'tracer', 'trace_code'
    })
    
    def __init__(self, target_filename: str = "<user_code>"):
        self.frames: List[Dict] = []
        self.step_count = 0
        self.target_filename = target_filename
        self.call_depth = 0
        
    def serialize_value(self, value: Any, depth: int = 0) -> Dict:
        """
        Convert a Python value to a JSON-serializable representation.
        Handles primitives, lists, dicts, and tracks object IDs.
        """
        if depth > 3:  # Prevent infinite recursion for deeply nested structures
            return {"value": "...", "type": "truncated", "id": id(value)}
        
        obj_id = id(value)
        
        # Handle None
        if value is None:
            return {"value": None, "type": "NoneType", "id": obj_id}
        
        # Handle booleans (must check before int, since bool is subclass of int)
        if isinstance(value, bool):
            return {"value": value, "type": "bool", "id": obj_id}
        
        # Handle integers
        if isinstance(value, int):
            return {"value": value, "type": "int", "id": obj_id}
        
        # Handle floats
        if isinstance(value, float):
            return {"value": value, "type": "float", "id": obj_id}
        
        # Handle strings
        if isinstance(value, str):
            truncated = value[:self.MAX_STRING_LENGTH]
            if len(value) > self.MAX_STRING_LENGTH:
                truncated += "..."
            return {"value": truncated, "type": "str", "id": obj_id}
        
        # Handle lists/arrays - THE KEY DATA STRUCTURE FOR LEETCODE
        if isinstance(value, list):
            serialized_items = []
            items_to_show = value[:self.MAX_LIST_LENGTH]
            
            for item in items_to_show:
                serialized_items.append(self.serialize_value(item, depth + 1))
            
            result = {
                "value": serialized_items,
                "type": "list",
                "id": obj_id,
                "length": len(value)
            }
            
            if len(value) > self.MAX_LIST_LENGTH:
                result["truncated"] = True
                
            return result
        
        # Handle tuples
        if isinstance(value, tuple):
            serialized_items = []
            items_to_show = list(value)[:self.MAX_LIST_LENGTH]
            
            for item in items_to_show:
                serialized_items.append(self.serialize_value(item, depth + 1))
            
            return {
                "value": serialized_items,
                "type": "tuple",
                "id": obj_id,
                "length": len(value)
            }
        
        # Handle dictionaries (hash maps)
        if isinstance(value, dict):
            serialized_dict = {}
            count = 0
            for k, v in value.items():
                if count >= 20:  # Limit dict entries
                    break
                key_str = str(k) if not isinstance(k, str) else k
                serialized_dict[key_str] = self.serialize_value(v, depth + 1)
                count += 1
            
            return {
                "value": serialized_dict,
                "type": "dict",
                "id": obj_id,
                "length": len(value)
            }
        
        # Handle sets
        if isinstance(value, set):
            items_list = list(value)[:self.MAX_LIST_LENGTH]
            serialized_items = [self.serialize_value(item, depth + 1) for item in items_list]
            
            return {
                "value": serialized_items,
                "type": "set",
                "id": obj_id,
                "length": len(value)
            }
        
        # Handle other objects - just show their string representation
        try:
            str_repr = str(value)[:self.MAX_STRING_LENGTH]
            return {
                "value": str_repr,
                "type": type(value).__name__,
                "id": obj_id
            }
        except:
            return {
                "value": "<unserializable>",
                "type": type(value).__name__,
                "id": obj_id
            }
    
    def capture_locals(self, local_vars: Dict) -> Dict[str, Dict]:
        """
        Capture all local variables, filtering out internal ones.
        """
        captured = {}
        
        for name, value in local_vars.items():
            # Skip internal variables
            if name.startswith('_') and not name.startswith('__'):
                # Allow single underscore (like _i in comprehensions) but not dunder
                if name.startswith('__'):
                    continue
            
            if name in self.IGNORED_VARS:
                continue
                
            # Skip functions and classes
            if callable(value) and not isinstance(value, (list, dict, set)):
                continue
            
            captured[name] = self.serialize_value(value)
        
        return captured
    
    def trace_function(self, frame, event: str, arg):
        """
        The actual trace function called by sys.settrace().
        """
        # Check step limit
        if self.step_count >= self.MAX_STEPS:
            return None
        
        # Only trace our target code, not library code
        filename = frame.f_code.co_filename
        if filename != self.target_filename:
            return self.trace_function  # Still return tracer for nested calls
        
        func_name = frame.f_code.co_name
        line_no = frame.f_lineno
        
        # Handle different events
        if event == "call":
            self.call_depth += 1
            self.step_count += 1
            
            self.frames.append({
                "step": self.step_count,
                "line": line_no,
                "event": "call",
                "function": func_name,
                "depth": self.call_depth,
                "variables": self.capture_locals(frame.f_locals)
            })
            
            return self.trace_function
        
        elif event == "line":
            self.step_count += 1
            
            self.frames.append({
                "step": self.step_count,
                "line": line_no,
                "event": "line",
                "function": func_name,
                "depth": self.call_depth,
                "variables": self.capture_locals(frame.f_locals)
            })
            
            return self.trace_function
        
        elif event == "return":
            self.step_count += 1
            
            return_value = self.serialize_value(arg) if arg is not None else None
            
            self.frames.append({
                "step": self.step_count,
                "line": line_no,
                "event": "return",
                "function": func_name,
                "depth": self.call_depth,
                "variables": self.capture_locals(frame.f_locals),
                "return_value": return_value
            })
            
            self.call_depth = max(0, self.call_depth - 1)
            return self.trace_function
        
        elif event == "exception":
            self.step_count += 1
            
            exc_type, exc_value, exc_tb = arg
            
            self.frames.append({
                "step": self.step_count,
                "line": line_no,
                "event": "exception",
                "function": func_name,
                "depth": self.call_depth,
                "variables": self.capture_locals(frame.f_locals),
                "exception": {
                    "type": exc_type.__name__ if exc_type else "Unknown",
                    "message": str(exc_value) if exc_value else ""
                }
            })
            
            return self.trace_function
        
        return self.trace_function
    
    def get_trace(self) -> List[Dict]:
        """Return the captured execution frames."""
        return self.frames
    
    def reset(self):
        """Reset the tracer for a new execution."""
        self.frames = []
        self.step_count = 0
        self.call_depth = 0


def trace_code(code: str) -> str:
    """
    Main entry point: trace the execution of user code.
    Returns JSON string of execution frames.
    """
    tracer = CodeTracer("<user_code>")
    
    # Compile the user code
    try:
        compiled = compile(code, "<user_code>", "exec")
    except SyntaxError as e:
        return json.dumps({
            "success": False,
            "error": f"SyntaxError: {e.msg} at line {e.lineno}",
            "frames": []
        })
    
    # Set up the execution environment
    exec_globals = {"__name__": "__main__", "__tracer__": tracer}
    exec_locals = {}
    
    # Install the tracer
    sys.settrace(tracer.trace_function)
    
    try:
        # Execute the user code
        exec(compiled, exec_globals, exec_locals)
        
        # Success!
        return json.dumps({
            "success": True,
            "error": None,
            "frames": tracer.get_trace()
        })
        
    except Exception as e:
        # Capture the error but return what we traced so far
        return json.dumps({
            "success": False,
            "error": f"{type(e).__name__}: {str(e)}",
            "frames": tracer.get_trace()
        })
        
    finally:
        # Always remove the tracer
        sys.settrace(None)
`;

export default TRACER_SCRIPT;

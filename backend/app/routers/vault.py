from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.routers.auth import get_db, get_current_user_obj
from app.models.user import User
from app.models.api import Api
from app.models.credential import ApiCredential
from app.models.environment import Environment
from app.models.environment_variable import EnvironmentVariable

from app.schemas.api import ApiCreate, ApiUpdate, ApiResponse
from app.schemas.credential import CredentialCreate, CredentialUpdate, CredentialResponse
from app.schemas.environment import EnvironmentCreate, EnvironmentUpdate, EnvironmentResponse, EnvironmentWithVariablesResponse
from app.schemas.environment_variable import EnvironmentVariableCreate, EnvironmentVariableUpdate, EnvironmentVariableResponse

router = APIRouter(tags=["API Vault"])

# =========================================================
# 1. API ROUTES
# =========================================================

# Create a new API in the Vault
@router.post("/apis", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
def create_api(
    api_in: ApiCreate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    # Automatically assign the authenticated user's ID
    new_api = Api(
        user_id=current_user.id,
        name=api_in.name,
        base_url=api_in.base_url,
        description=api_in.description,
        auth_type=api_in.auth_type,
        status="unknown",
        openapi_url=api_in.openapi_url
    )
    db.add(new_api)
    db.commit()
    db.refresh(new_api)
    return new_api

# List all APIs owned by the authenticated user
@router.get("/apis", response_model=List[ApiResponse])
def list_apis(
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    apis = db.query(Api).filter(Api.user_id == current_user.id).order_by(Api.created_at.desc()).all()
    return apis

# Get details of a single API (verifies user ownership)
@router.get("/apis/{api_id}", response_model=ApiResponse)
def get_api(
    api_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    api = db.query(Api).filter(Api.id == api_id, Api.user_id == current_user.id).first()
    if not api:
        raise HTTPException(status_code=404, detail="API not found")
    return api

# Update an existing API (verifies user ownership)
@router.put("/apis/{api_id}", response_model=ApiResponse)
def update_api(
    api_id: int,
    api_in: ApiUpdate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    api = db.query(Api).filter(Api.id == api_id, Api.user_id == current_user.id).first()
    if not api:
        raise HTTPException(status_code=404, detail="API not found")

    update_data = api_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(api, field, value)

    db.commit()
    db.refresh(api)
    return api

# Delete an API (verifies user ownership, cascade deletes credentials & environments)
@router.delete("/apis/{api_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_api(
    api_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    api = db.query(Api).filter(Api.id == api_id, Api.user_id == current_user.id).first()
    if not api:
        raise HTTPException(status_code=404, detail="API not found")

    db.delete(api)
    db.commit()
    return None

# =========================================================
# 2. CREDENTIAL ROUTES
# =========================================================

# Add a credential to an API
@router.post("/apis/{api_id}/credentials", response_model=CredentialResponse, status_code=status.HTTP_201_CREATED)
def create_credential(
    api_id: int,
    cred_in: CredentialCreate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    # Ensure API exists and is owned by the current user
    api = db.query(Api).filter(Api.id == api_id, Api.user_id == current_user.id).first()
    if not api:
        raise HTTPException(status_code=404, detail="API not found")

    new_cred = ApiCredential(
        api_id=api.id,
        name=cred_in.name,
        type=cred_in.type,
        value=cred_in.value,
        expires_at=cred_in.expires_at
    )
    db.add(new_cred)
    db.commit()
    db.refresh(new_cred)
    return new_cred

# List all credentials for an API (values are masked in response)
@router.get("/apis/{api_id}/credentials", response_model=List[CredentialResponse])
def list_credentials(
    api_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    api = db.query(Api).filter(Api.id == api_id, Api.user_id == current_user.id).first()
    if not api:
        raise HTTPException(status_code=404, detail="API not found")

    credentials = db.query(ApiCredential).filter(ApiCredential.api_id == api.id).all()
    return credentials

# Update an existing credential
@router.put("/credentials/{credential_id}", response_model=CredentialResponse)
def update_credential(
    credential_id: int,
    cred_in: CredentialUpdate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    # Verify ownership via relationship to Api and User
    credential = db.query(ApiCredential).join(Api).filter(
        ApiCredential.id == credential_id,
        Api.user_id == current_user.id
    ).first()

    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")

    update_data = cred_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(credential, field, value)

    db.commit()
    db.refresh(credential)
    return credential

# Delete a credential
@router.delete("/credentials/{credential_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_credential(
    credential_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    credential = db.query(ApiCredential).join(Api).filter(
        ApiCredential.id == credential_id,
        Api.user_id == current_user.id
    ).first()

    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")

    db.delete(credential)
    db.commit()
    return None

# =========================================================
# 3. ENVIRONMENT ROUTES
# =========================================================

# Create an environment for an API
@router.post("/apis/{api_id}/environments", response_model=EnvironmentResponse, status_code=status.HTTP_201_CREATED)
def create_environment(
    api_id: int,
    env_in: EnvironmentCreate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    api = db.query(Api).filter(Api.id == api_id, Api.user_id == current_user.id).first()
    if not api:
        raise HTTPException(status_code=404, detail="API not found")

    new_env = Environment(
        api_id=api.id,
        name=env_in.name
    )
    db.add(new_env)
    db.commit()
    db.refresh(new_env)
    return new_env

# List environments for an API (including their variables)
@router.get("/apis/{api_id}/environments", response_model=List[EnvironmentWithVariablesResponse])
def list_environments(
    api_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    api = db.query(Api).filter(Api.id == api_id, Api.user_id == current_user.id).first()
    if not api:
        raise HTTPException(status_code=404, detail="API not found")

    environments = db.query(Environment).filter(Environment.api_id == api.id).all()
    
    # Mask secret variable values for security
    for env in environments:
        for var in env.variables:
            if var.is_secret:
                var.value = "••••••••"

    return environments

# Update an environment
@router.put("/environments/{environment_id}", response_model=EnvironmentResponse)
def update_environment(
    environment_id: int,
    env_in: EnvironmentUpdate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    env = db.query(Environment).join(Api).filter(
        Environment.id == environment_id,
        Api.user_id == current_user.id
    ).first()

    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")

    env.name = env_in.name
    db.commit()
    db.refresh(env)
    return env

# Delete an environment
@router.delete("/environments/{environment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_environment(
    environment_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    env = db.query(Environment).join(Api).filter(
        Environment.id == environment_id,
        Api.user_id == current_user.id
    ).first()

    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")

    db.delete(env)
    db.commit()
    return None

# =========================================================
# 4. ENVIRONMENT VARIABLE ROUTES
# =========================================================

# Add a variable to an environment
@router.post("/environments/{environment_id}/variables", response_model=EnvironmentVariableResponse, status_code=status.HTTP_201_CREATED)
def create_environment_variable(
    environment_id: int,
    var_in: EnvironmentVariableCreate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    env = db.query(Environment).join(Api).filter(
        Environment.id == environment_id,
        Api.user_id == current_user.id
    ).first()

    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")

    new_var = EnvironmentVariable(
        environment_id=env.id,
        key=var_in.key,
        value=var_in.value,
        is_secret=var_in.is_secret
    )
    db.add(new_var)
    db.commit()
    db.refresh(new_var)

    if new_var.is_secret:
        new_var.value = "••••••••"

    return new_var

# List all variables for an environment
@router.get("/environments/{environment_id}/variables", response_model=List[EnvironmentVariableResponse])
def list_environment_variables(
    environment_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    env = db.query(Environment).join(Api).filter(
        Environment.id == environment_id,
        Api.user_id == current_user.id
    ).first()

    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")

    variables = db.query(EnvironmentVariable).filter(
        EnvironmentVariable.environment_id == env.id
    ).all()

    for var in variables:
        if var.is_secret:
            var.value = "••••••••"

    return variables

# Update a variable
@router.put("/variables/{variable_id}", response_model=EnvironmentVariableResponse)
def update_environment_variable(
    variable_id: int,
    var_in: EnvironmentVariableUpdate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    var = db.query(EnvironmentVariable).join(Environment).join(Api).filter(
        EnvironmentVariable.id == variable_id,
        Api.user_id == current_user.id
    ).first()

    if not var:
        raise HTTPException(status_code=404, detail="Variable not found")

    update_data = var_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(var, field, value)

    db.commit()
    db.refresh(var)

    if var.is_secret:
        var.value = "••••••••"

    return var

# Delete a variable
@router.delete("/variables/{variable_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_environment_variable(
    variable_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    var = db.query(EnvironmentVariable).join(Environment).join(Api).filter(
        EnvironmentVariable.id == variable_id,
        Api.user_id == current_user.id
    ).first()

    if not var:
        raise HTTPException(status_code=404, detail="Variable not found")

    db.delete(var)
    db.commit()
    return None
